// src/app/components/home/home.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  imports: [MatIconModule, NgFor]
})
export class HomeComponent {
  constructor(private router: Router, private authService: AuthService) { }

  scrolltoBottom() {
    window.scrollTo(0, document.body.scrollHeight);
  }
  ontryNow() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/tools']);
    } else {
      this.router.navigate(['/login']);
    }
  }
}
