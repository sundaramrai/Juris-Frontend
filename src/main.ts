import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './app/app.component';
import { routes } from './app/app-routing.module';
import { AuthInterceptor } from './app/interceptors/auth.interceptor';
import { environment } from './environments/environment';

if (environment.production) {
  console.log = () => { };
  console.warn = () => { };
  console.error = () => { };
}

await bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideHttpClient(withInterceptors([AuthInterceptor])),
    provideRouter(routes),
  ],
});