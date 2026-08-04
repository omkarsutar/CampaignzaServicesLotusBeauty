import { Component, inject, signal } from '@angular/core';
import { BrandData, BrandDataService } from '../../services/brand-data.service';

@Component({
  selector: 'app-pre-youtube',
  imports: [],
  templateUrl: './pre-youtube.html',
  styleUrl: './pre-youtube.css',
})
export class PreYoutube {

  private readonly brandDataService = inject(BrandDataService);
  readonly brand = signal<BrandData | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() {
    this.loadBrand();
  }

  get youtubeUrl(): string {
    const currentBrand = this.brand();
    if (!currentBrand?.youtube_url) {
      return '#';
    }

    return currentBrand.youtube_url;
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
      window.location.href = this.youtubeUrl;
    }, 400);
  }
}
