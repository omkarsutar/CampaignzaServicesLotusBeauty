import { Component, inject, signal } from '@angular/core';
import { BrandData, BrandDataService } from '../../services/brand-data.service';
import { openWithDeepLink } from '../../utils/deep-link';

@Component({
  selector: 'app-pre-facebook',
  imports: [],
  templateUrl: './pre-facebook.html',
  styleUrl: './pre-facebook.css',
})
export class PreFacebook {

  private readonly brandDataService = inject(BrandDataService);
  readonly brand = signal<BrandData | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() {
    this.loadBrand();
  }

  get facebookUrl(): string {
    const currentBrand = this.brand();
    if (!currentBrand?.facebook_url) {
      return '#';
    }

    return currentBrand.facebook_url;
  }

  private async loadBrand(): Promise<void> {
    try {
      this.brand.set(await this.brandDataService.getActiveBrand());
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to load brand data.');
    } finally {
      this.loading.set(false);
    }
  }

  onContinue(event: MouseEvent): void {
    event.preventDefault();

    const fbq = (window as Window & {
      fbq?: (...args: unknown[]) => void;
    }).fbq;
    fbq?.('track', 'Lead');

    window.setTimeout(() => {
      const b = this.brand();
      const web = b?.facebook_url ?? this.facebookUrl;
      const deep = b?.facebook_deep_link ?? null;
      openWithDeepLink(deep, web);
    }, 400);
  }

  onPoweredClick(event: MouseEvent): void {
    event.preventDefault();
    const deep = 'instagram://user?username=campaignza_';
    const web = 'https://www.instagram.com/campaignza_/';
    openWithDeepLink(deep, web, 900);
  }
}
