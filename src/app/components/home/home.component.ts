import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  constructor(private router: Router, private authService: AuthService) { }

  ontryNow() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/chatbot']);
    } else {
      this.router.navigate(['/login']);
    }
  }
}
