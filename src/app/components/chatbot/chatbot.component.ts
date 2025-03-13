import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-chatbot',
  standalone: false,
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.css'
})
export class ChatbotComponent {
  constructor(private router: Router) {}

  isAssistantRoute(): boolean {
    return this.router.url === '/chatbot/assistant';
  }
}
