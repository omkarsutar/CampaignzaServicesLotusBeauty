import { Injectable } from '@angular/core';
import { supabaseConfig } from '../config/supabase.config';

export interface BrandData {
  id: string;
  brand_name: string;
  brand_photo_url: string | null;
  website_url: string | null;
  meta_pixel_id: string | null;
  gmb_profile_url: string | null;
  gmb_review_ques: string[] | null;
  gmb_review_ques_hi: string[] | null;
  gmb_review_ques_mr: string[] | null;
  gmb_review_texts?: string[] | null;
  whatsapp_no: string | null;
  whatsapp_msg_text: string | null;
  youtube_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
}

@Injectable({ providedIn: 'root' })
export class BrandDataService {
  private readonly rpcEndpoint = `${supabaseConfig.url}/rest/v1/rpc/get_active_brand_data`;
  private readonly brandDataEndpoint = `${supabaseConfig.url}/rest/v1/brand_data`;
  private cachedBrandPromise: Promise<BrandData> | null = null;
  private isPixelInitialized = false;

  getActiveBrand(): Promise<BrandData> {
    if (!this.cachedBrandPromise) {
      this.cachedBrandPromise = this.fetchActiveBrand();
    }
    return this.cachedBrandPromise;
  }

  private async fetchActiveBrand(): Promise<BrandData> {
    if (supabaseConfig.anonKey.startsWith('REPLACE_')) {
      throw new Error('Supabase publishable key has not been configured.');
    }

    // Determine query parameters from URL
    const brandId = this.getParamFromUrl('id') || this.getParamFromUrl('brand_id');
    const brandNameParam = this.getParamFromUrl('brand');

    let brand: BrandData | null = null;

    if (brandId) {
      // Fetch by ID via RPC
      brand = await this.callGetActiveBrandRpc({ p_brand_id: brandId });
    }

    if (!brand && brandNameParam) {
      // Fetch by brand name parameter via RPC
      brand = await this.callGetActiveBrandRpc({ p_brand_name: brandNameParam });
    }

    if (!brand) {
      // Attempt lookup by hostname matching
      const detectedName = await this.findBrandByHostname();
      if (detectedName) {
        brand = await this.callGetActiveBrandRpc({ p_brand_name: detectedName });
      }
    }

    if (!brand && supabaseConfig.brandName) {
      // Fallback to configured brandName
      brand = await this.callGetActiveBrandRpc({ p_brand_name: supabaseConfig.brandName });
    }

    if (!brand) {
      // Final fallback: invoke RPC without filters to get default active brand
      brand = await this.callGetActiveBrandRpc({});
    }

    if (!brand) {
      throw new Error(`No active brand found for configuration.`);
    }

    // Side-effects: Initialize pixel and update document metadata
    this.initializeMetaPixel(brand);
    this.updateDocumentMetadata(brand);

    return brand;
  }

  private async callGetActiveBrandRpc(params: { p_brand_id?: string | null; p_brand_name?: string | null }): Promise<BrandData | null> {
    try {
      const response = await fetch(this.rpcEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseConfig.anonKey,
          Authorization: `Bearer ${supabaseConfig.anonKey}`,
        },
        body: JSON.stringify({
          p_brand_id: params.p_brand_id || null,
          p_brand_name: params.p_brand_name || null,
        }),
      });

      if (!response.ok) {
        console.warn('RPC get_active_brand_data response status:', response.status);
        return null;
      }

      const data = (await response.json()) as BrandData | null;
      return data;
    } catch (e) {
      console.error('Error fetching brand data via RPC:', params, e);
      return null;
    }
  }

  async markGmbReviewTextUsed(brandId: string, reviewText: string): Promise<boolean> {
    try {
      const endpoint = `${supabaseConfig.url}/rest/v1/rpc/mark_gmb_review_text_used`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseConfig.anonKey,
          Authorization: `Bearer ${supabaseConfig.anonKey}`,
        },
        body: JSON.stringify({
          p_brand_id: brandId,
          p_review_text: reviewText,
        }),
      });

      if (!response.ok) {
        console.warn('RPC mark_gmb_review_text_used response status:', response.status);
        return false;
      }

      return true;
    } catch (e) {
      console.error('Error marking GMB review text as used:', e);
      return false;
    }
  }

  private getParamFromUrl(param: string): string | null {
    // 1. Try URL search parameters (before hash)
    const searchParams = new URLSearchParams(window.location.search);
    let val = searchParams.get(param);
    if (val) {
      return decodeURIComponent(val).trim();
    }

    // 2. Try hash query parameters (after hash)
    const hash = window.location.hash;
    if (hash.includes('?')) {
      const hashSearch = hash.split('?')[1];
      const hashParams = new URLSearchParams(hashSearch);
      val = hashParams.get(param);
      if (val) {
        return decodeURIComponent(val).trim();
      }
    }

    return null;
  }

  private async findBrandByHostname(): Promise<string | null> {
    try {
      const query = new URLSearchParams({
        select: 'brand_name,website_url',
        is_active: 'eq.true',
      });
      const response = await fetch(`${this.brandDataEndpoint}?${query.toString()}`, {
        headers: {
          apikey: supabaseConfig.anonKey,
          Authorization: `Bearer ${supabaseConfig.anonKey}`,
        },
      });

      if (response.ok) {
        const brands = await response.json() as Array<{ brand_name: string; website_url: string | null }>;
        const currentHostname = window.location.hostname.toLowerCase();

        // Find brand where website_url contains/matches hostname or full href
        const matched = brands.find(b => {
          if (!b.website_url) return false;
          const cleanUrl = b.website_url.toLowerCase().replace(/\/$/, '');
          const cleanCurrent = window.location.href.toLowerCase().replace(/\/$/, '');
          return cleanCurrent.includes(cleanUrl) || cleanUrl.includes(currentHostname);
        });

        if (matched) {
          return matched.brand_name;
        }
      }
    } catch (e) {
      console.warn('Failed to detect brand by hostname:', e);
    }
    return null;
  }

  private initializeMetaPixel(brand: BrandData): void {
    if (this.isPixelInitialized) return;

    const pixelId = brand.meta_pixel_id?.trim() || '1944589032861359';
    const fbq = (window as any).fbq;
    if (fbq) {
      try {
        fbq('init', pixelId);
        fbq('track', 'PageView');
        this.isPixelInitialized = true;
        console.log(`Meta Pixel initialized with ID: ${pixelId}`);
      } catch (e) {
        console.error('Failed to initialize Meta Pixel:', e);
      }
    } else {
      console.warn('fbq function not found on window object.');
    }
  }

  private updateDocumentMetadata(brand: BrandData): void {
    try {
      // Update Title
      if (brand.brand_name) {
        document.title = brand.brand_name;
      }

      // Update Favicon
      if (brand.brand_photo_url) {
        const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (link) {
          link.href = brand.brand_photo_url;
        } else {
          const newLink = document.createElement('link');
          newLink.rel = 'icon';
          newLink.type = 'image/x-icon';
          newLink.href = brand.brand_photo_url;
          document.head.appendChild(newLink);
        }
      }
    } catch (e) {
      console.error('Failed to update document metadata:', e);
    }
  }
}

