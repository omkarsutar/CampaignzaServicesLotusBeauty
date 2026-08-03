import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { PreWhatsapp } from './pages/pre-whatsapp/pre-whatsapp';
import { gmbReview } from './pages/gmb-review/gmb-review';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'pre-whatsapp', component: PreWhatsapp },
  { path: 'gmb-review', component: gmbReview },
  { path: '**', redirectTo: '' },
];
