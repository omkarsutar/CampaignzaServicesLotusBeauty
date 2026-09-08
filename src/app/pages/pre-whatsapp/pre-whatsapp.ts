import { Component, inject, signal } from '@angular/core';
import { BrandData, BrandDataService } from '../../services/brand-data.service';
import { openWithDeepLink } from '../../utils/deep-link';

@Component({
  selector: 'app-pre-whatsapp',
  imports: [],
  templateUrl: './pre-whatsapp.html',
  styleUrl: './pre-whatsapp.css',
})
export class PreWhatsapp {

  private readonly brandDataService = inject(BrandDataService);
  readonly brand = signal<BrandData | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() {
    this.loadBrand();
  }

  get whatsappUrl(): string {
    const currentBrand = this.brand();
    if (!currentBrand?.whatsapp_no) {
      return '#';
    }

    const number = currentBrand.whatsapp_no.replace(/\D/g, '');
    const message = encodeURIComponent(currentBrand.whatsapp_msg_text ?? 'Hello');
    return `https://wa.me/${number}?text=${message}`;
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
      if (!b?.whatsapp_no) {
        return;
      }
      const number = b.whatsapp_no.replace(/\D/g, '');
      const message = encodeURIComponent(b.whatsapp_msg_text ?? 'Hello');
      const web = `https://wa.me/${number}?text=${message}`;
      const deep = b.whatsapp_deep_link ?? `whatsapp://send?phone=${number}&text=${message}`;
      openWithDeepLink(deep, web);
    }, 400);
  }
}
