import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { PreWhatsapp } from './pages/pre-whatsapp/pre-whatsapp';
import { PreFacebook } from './pages/pre-facebook/pre-facebook';
import { gmbReview } from './pages/gmb-review/gmb-review';
import { PreYoutube } from './pages/pre-youtube/pre-youtube';
import { PreInstagram } from './pages/pre-instagram/pre-instagram';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'pre-whatsapp', component: PreWhatsapp },
  { path: 'pre-facebook', component: PreFacebook },
  { path: 'pre-instagram', component: PreInstagram },
  { path: 'pre-youtube', component: PreYoutube },
  { path: 'gmb-review', component: gmbReview },
  { path: '**', redirectTo: '' },
];
