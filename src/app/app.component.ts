import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [NgClass, MatIconModule, RouterOutlet, MatMenuModule],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Juris AI';
  isLoginPage = false;
  isRegisterPage = false;
  isLoggedIn = false;
  isDarkTheme = false;
  username: string | undefined;
  private readonly systemThemeMediaQuery: MediaQueryList;
  private mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null;
  private routerSubscription: Subscription | null = null;
  private authSubscription: Subscription | null = null;
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  constructor() {
    this.systemThemeMediaQuery = globalThis.matchMedia('(prefers-color-scheme: dark)');
  }

  ngOnInit() {
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.username = user?.username;
      this.isLoggedIn = Boolean(user) && this.authService.isLoggedIn();
    });

    this.routerSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) this.updateRouteState(event.url);
    });

    this.isLoggedIn = this.authService.isLoggedIn();
    const savedTheme = localStorage.getItem('theme');
    this.isDarkTheme = savedTheme ? savedTheme === 'dark' : this.systemThemeMediaQuery.matches;
    this.applyTheme();

    this.mediaQueryListener = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        this.isDarkTheme = e.matches;
        this.applyTheme();
      }
    };
    this.systemThemeMediaQuery.addEventListener('change', this.mediaQueryListener);
  }

  ngOnDestroy() {
    if (this.mediaQueryListener) {
      this.systemThemeMediaQuery.removeEventListener('change', this.mediaQueryListener);
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  toggleTheme = (): void => {
    this.isDarkTheme = !this.isDarkTheme;
    localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
    this.applyTheme();
  };

  private readonly applyTheme = (): void => {
    document.body.classList.toggle('dark-theme', this.isDarkTheme);
    this.updateFavicon(this.isDarkTheme ? 'dark' : 'light');
  };

  private readonly updateFavicon = (theme: 'light' | 'dark'): void => {
    const favicon = document.getElementById('favicon') as HTMLLinkElement;
    if (favicon) {
      const timestamp = Date.now();
      favicon.href = `${theme === 'dark' ? 'logo-white.svg' : 'logo-blue.svg'}?v=${timestamp}`;
    }
  };

  private readonly updateRouteState = (currentUrl: string) => {
    this.isLoginPage = currentUrl === '/login';
    this.isRegisterPage = currentUrl === '/register';
    this.isLoggedIn = this.authService.isLoggedIn();

    if (this.isLoggedIn && (this.isLoginPage || this.isRegisterPage)) {
      this.router.navigate(['/assistant']);
    }
  };

  private readonly performLogout = () => {
    this.authService.logout().subscribe({
      next: () => {
        this.isLoggedIn = false;
      },
      error: (error) => {
        console.error('Logout failed:', error);
        this.isLoggedIn = false;
        this.router.navigate(['/home']);
      }
    });
  };

  onLogout = () => this.performLogout();

  get loggedInUser(): string | null {
    return this.authService.loggedInUser;
  }

  onHome = () => this.router.navigate(['/home']);
  onGetStarted = () => this.router.navigate(['/login']);
  onLogin = () => this.router.navigate(['/login']);

  isChatbotPage = (): boolean => this.router.url === '/assistant';
  isLoginOrRegisterPage = (): boolean => ['/login', '/register'].includes(this.router.url);
}
