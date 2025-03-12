import { Component } from '@angular/core';
import { Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-chat-options',
  standalone: false,

  templateUrl: './chat-options.component.html',
  styleUrl: './chat-options.component.css'
})
export class ChatOptionsComponent {
  @Input() selectedTab!: string;  // Get selected tab from parent
  @Output() tabChanged = new EventEmitter<string>(); // Emit tab change

  changeTab(tab: string) {
    this.tabChanged.emit(tab); // Notify parent component
  }
}
