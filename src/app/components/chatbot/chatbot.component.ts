import { Component } from '@angular/core';

@Component({
  selector: 'app-chatbot',
  standalone: false,
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.css'
})
export class ChatbotComponent {
  selectedTab: string = 'general'; // Default selected tab

  // Function to update tab when emitted from child
  onTabChange(tab: string) {
    this.selectedTab = tab;
  }
}
