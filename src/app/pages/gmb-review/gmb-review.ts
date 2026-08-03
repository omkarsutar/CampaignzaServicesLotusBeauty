import { Component, computed, inject, signal } from '@angular/core';
import { BrandData, BrandDataService } from '../../services/brand-data.service';

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionLike;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

@Component({
  selector: 'app-gmb-review',
  imports: [],
  templateUrl: './gmb-review.html',
  styleUrl: './gmb-review.css',
})
export class gmbReview {
  private readonly brandDataService = inject(BrandDataService);
  private recognition: SpeechRecognitionLike | null = null;

  readonly brand = signal<BrandData | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly language = signal<'en' | 'hi' | 'mr'>('en');
  readonly questionPosition = signal(0);
  readonly questionOrder = signal<number[]>([]);
  readonly answerText = signal('');
  readonly isListening = signal(false);
  readonly speechMessage = signal('');
  readonly copied = signal(false);
  readonly copyError = signal(false);

  readonly questions = computed(() => {
    const currentBrand = this.brand();
    if (!currentBrand) return [];

    switch (this.language()) {
      case 'hi': return currentBrand.gmb_review_texts_hi ?? [];
      case 'mr': return currentBrand.gmb_review_texts_mr ?? [];
      default: return currentBrand.gmb_review_texts ?? [];
    }
  });

  readonly currentQuestion = computed(() => {
    const questionIndex = this.questionOrder()[this.questionPosition()];
    return this.questions()[questionIndex] ?? '';
  });

  get googleReviewUrl(): string {
    return this.brand()?.gmb_profile_url ?? '#';
  }

  constructor() {
    this.loadBrand();
  }

  selectLanguage(language: 'en' | 'hi' | 'mr'): void {
    this.stopListening();
    this.language.set(language);
    this.questionPosition.set(0);
    this.questionOrder.set(this.createRandomOrder(this.questions().length));
    this.speechMessage.set('');
    this.resetCopyStatus();
  }

  showPrevious(): void {
    this.stopListening();
    if (this.questionPosition() > 0) {
      this.questionPosition.update((position) => position - 1);
      this.resetCopyStatus();
    }
  }

  showNext(): void {
    this.stopListening();
    if (this.questionPosition() < this.questions().length - 1) {
      this.questionPosition.update((position) => position + 1);
      this.resetCopyStatus();
    }
  }

  updateAnswer(event: Event): void {
    this.answerText.set((event.target as HTMLTextAreaElement).value);
    this.resetCopyStatus();
  }

  toggleSpeech(): void {
    if (this.isListening()) {
      this.stopListening();
      return;
    }

    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      this.speechMessage.set('Speech input is not supported in this browser. Please type your answer instead.');
      return;
    }

    this.speechMessage.set('Listening... speak your answer now.');
    this.recognition = new Recognition();
    this.recognition.lang = this.language() === 'hi' ? 'hi-IN' : this.language() === 'mr' ? 'mr-IN' : 'en-IN';
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;
    this.recognition.onresult = (event) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) transcript += result[0].transcript;
      }

      if (transcript.trim()) {
        this.answerText.update((current) => current ? `${current.trim()} ${transcript.trim()}` : transcript.trim());
        this.resetCopyStatus();
      }
    };
    this.recognition.onerror = () => {
      this.isListening.set(false);
      this.speechMessage.set('We could not hear that. Please try again or type your answer.');
    };
    this.recognition.onend = () => {
      this.isListening.set(false);
      if (!this.speechMessage().startsWith('We could')) {
        this.speechMessage.set('Answer added. You can continue to the next question.');
      }
    };
    this.isListening.set(true);
    this.recognition.start();
  }

  stopListening(): void {
    this.recognition?.stop();
    this.recognition = null;
    this.isListening.set(false);
  }

  async copyAndContinue(): Promise<void> {
    const answer = this.answerText().trim();
    if (!answer) {
      this.copyError.set(true);
      return;
    }

    this.copyError.set(false);

    try {
      await navigator.clipboard.writeText(answer);
      this.copied.set(true);
    } catch {
      this.copyError.set(true);
    }

    const fbq = (window as Window & {
      fbq?: (...args: unknown[]) => void;
    }).fbq;
    fbq?.('track', 'Lead');

    window.setTimeout(() => {
      window.location.href = this.googleReviewUrl;
    }, 400);
  }

  private async loadBrand(): Promise<void> {
    try {
      const currentBrand = await this.brandDataService.getActiveBrand();
      this.brand.set(currentBrand);
      this.questionOrder.set(this.createRandomOrder(this.questions().length));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to load brand data.');
    } finally {
      this.loading.set(false);
    }
  }

  private createRandomOrder(length: number): number[] {
    const order = Array.from({ length }, (_, index) => index);
    for (let index = order.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [order[index], order[randomIndex]] = [order[randomIndex], order[index]];
    }
    return order;
  }

  private resetCopyStatus(): void {
    this.copied.set(false);
    this.copyError.set(false);
  }
}
