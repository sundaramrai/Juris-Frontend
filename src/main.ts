import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app/app.component';
import { routes } from './app/app-routing.module';
import { AuthInterceptor } from './app/interceptors/auth.interceptor';
import { environment } from './environments/environment';

if (environment.production) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  console.log = () => { };
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  console.warn = () => { };
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  console.error = () => { };
}

try {
  await bootstrapApplication(AppComponent, {
    providers: [
      provideHttpClient(withInterceptors([AuthInterceptor])),
      provideRouter(routes),
      provideAnimations()
    ]
  });
} catch (err) {
  console.error(err);
}
