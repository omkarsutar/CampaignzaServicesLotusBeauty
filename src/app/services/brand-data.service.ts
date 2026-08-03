import { Injectable } from '@angular/core';
import { supabaseConfig } from '../config/supabase.config';

export interface BrandData {
  id: string;
  brand_name: string;
  brand_photo_url: string | null;
  website_url: string | null;
  meta_pixel_id: string | null;
  gmb_profile_url: string | null;
  gmb_review_texts: string[] | null;
  gmb_review_texts_hi: string[] | null;
  gmb_review_texts_mr: string[] | null;
  whatsapp_no: string | null;
  whatsapp_msg_text: string | null;
}

@Injectable({ providedIn: 'root' })
export class BrandDataService {
  private readonly endpoint = `${supabaseConfig.url}/rest/v1/brand_data`;
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

    // Determine query strategy
    const brandId = this.getParamFromUrl('id') || this.getParamFromUrl('brand_id');
    const brandNameParam = this.getParamFromUrl('brand');

    let brand: BrandData | null = null;

    if (brandId) {
      // Fetch specifically by ID/UUID
      brand = await this.fetchBrandByQuery({ id: `eq.${brandId}` });
    }

    if (!brand && brandNameParam) {
      // Fetch by brand name query param
      brand = await this.fetchBrandByQuery({ brand_name: `eq.${brandNameParam}` });
    }

    if (!brand) {
      // Attempt lookup by hostname matching
      const detectedName = await this.findBrandByHostname();
      if (detectedName) {
        brand = await this.fetchBrandByQuery({ brand_name: `eq.${detectedName}` });
      }
    }

    if (!brand) {
      // Fallback to configured brandName
      brand = await this.fetchBrandByQuery({ brand_name: `eq.${supabaseConfig.brandName}` });
    }

    if (!brand) {
      throw new Error(`No active brand found for configuration.`);
    }

    // Side-effects: Initialize pixel and update document metadata
    this.initializeMetaPixel(brand);
    this.updateDocumentMetadata(brand);

    return brand;
  }

  private async fetchBrandByQuery(filters: Record<string, string>): Promise<BrandData | null> {
    try {
      const queryParams: Record<string, string> = {
        select: [
          'id',
          'brand_name',
          'brand_photo_url',
          'website_url',
          'meta_pixel_id',
          'gmb_profile_url',
          'gmb_review_texts',
          'gmb_review_texts_hi',
          'gmb_review_texts_mr',
          'whatsapp_no',
          'whatsapp_msg_text',
        ].join(','),
        is_active: 'eq.true',
        limit: '1',
      };

      // Add dynamic filters
      Object.assign(queryParams, filters);

      const query = new URLSearchParams(queryParams);
      const response = await fetch(`${this.endpoint}?${query.toString()}`, {
        headers: {
          apikey: supabaseConfig.anonKey,
          Authorization: `Bearer ${supabaseConfig.anonKey}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const brands = (await response.json()) as BrandData[];
      return brands.length ? brands[0] : null;
    } catch (e) {
      console.error('Error fetching brand by query:', filters, e);
      return null;
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
      const response = await fetch(`${this.endpoint}?${query.toString()}`, {
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
