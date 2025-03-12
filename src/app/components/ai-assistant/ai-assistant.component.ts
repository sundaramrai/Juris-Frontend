import { Component, ElementRef, OnInit, ViewChild, NgZone, AfterViewInit } from '@angular/core';
import { ResponseService } from '../../services/response.service';
import { Message } from '../../Interface';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-ai-assistant',
  standalone: false,
  templateUrl: './ai-assistant.component.html',
  styleUrls: ['./ai-assistant.component.css']
})
export class AiAssistantComponent implements OnInit, AfterViewInit {
  messages: Message[] = [];
  userInput: string = '';
  username: string | null = null;
  isLoading: boolean = false;
  isListening: boolean = false;
  recognition: any;
  interimTranscript: string = '';
  finalTranscript: string = '';
  confidenceThreshold: number = 0.7; // Confidence threshold for speech recognition
  pauseDelay: number = 2000; // Pause duration in milliseconds before auto-stopping
  pauseTimer: any; // Timer for detecting long pauses

  @ViewChild('messagesArea') messagesArea!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  constructor(
    private responseService: ResponseService,
    private http: HttpClient,
    private ngZone: NgZone,
    private sanitizer: DomSanitizer
  ) {
    // Initialize speech recognition
    this.initSpeechRecognition();
  }

  ngOnInit(): void {
    const user = localStorage.getItem('user');
    if (user) {
      this.username = JSON.parse(user).username;
      this.loadChatHistory();
    }
  }

  ngAfterViewInit(): void {
    this.initScrollListener();
  }

  initSpeechRecognition(): void {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        // Reset transcripts when starting a new session
        this.finalTranscript = '';
        this.interimTranscript = '';
      };

      this.recognition.onresult = (event: any) => {
        // Clear the pause timer whenever new speech is detected
        if (this.pauseTimer) {
          clearTimeout(this.pauseTimer);
        }

        this.interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          if (event.results[i].isFinal) {
            if (confidence >= this.confidenceThreshold) {
              this.finalTranscript += ' ' + transcript;
              this.finalTranscript = this.finalTranscript.trim();
            }
          } else {
            if (confidence >= this.confidenceThreshold) {
              this.interimTranscript += transcript;
            }
          }
        }

        // Update UI with the current transcript
        this.ngZone.run(() => {
          this.userInput = (this.finalTranscript + ' ' + this.interimTranscript).trim();
          setTimeout(() => {
            if (this.messageInput) {
              this.autoResizeTextarea(this.messageInput.nativeElement);
            }
          }, 0);
        });

        // Start/restart the pause timer to stop recognition after a long pause
        this.pauseTimer = setTimeout(() => {
          this.ngZone.run(() => {
            this.processFinalTranscript();
            if (this.isListening) {
              this.recognition.stop();
              this.isListening = false;
            }
          });
        }, this.pauseDelay);
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          this.ngZone.run(() => {
            this.isListening = false;
          });
        }
      };

      this.recognition.onend = () => {
        // When recognition stops, ensure punctuation is processed
        this.ngZone.run(() => {
          this.processFinalTranscript();
        });
      };
    }
  }

  autoResizeTextarea(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto';
    const newHeight = Math.min(150, textarea.scrollHeight);
    textarea.style.height = `${newHeight}px`;
  }

  toggleSpeechRecognition(): void {
    if (!this.recognition) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }
    if (this.isListening) {
      if (this.pauseTimer) {
        clearTimeout(this.pauseTimer);
      }
      this.recognition.stop();
      this.isListening = false;
      this.ngZone.run(() => {
        this.userInput = this.finalTranscript.trim();
        setTimeout(() => {
          if (this.messageInput) {
            this.autoResizeTextarea(this.messageInput.nativeElement);
          }
        }, 0);
      });
    } else {
      // If there is already text, preserve it in the final transcript
      this.finalTranscript = this.userInput.trim() || '';
      this.interimTranscript = '';
      try {
        this.recognition.start();
        this.isListening = true;
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }
  }

  // A simple heuristic to add punctuation based on the content of the sentence.
  processFinalTranscript(): void {
    let transcript = this.finalTranscript.trim();
    if (transcript && !/[.!?]$/.test(transcript)) {
      // Simple heuristic: if the first word is a common question word, add '?'
      const questionWords = ['what', 'why', 'when', 'where', 'how', 'do', 'does', 'did', 'is', 'are', 'can', 'could', 'would', 'should'];
      const firstWord = transcript.split(' ')[0].toLowerCase();
      if (questionWords.includes(firstWord)) {
        transcript += '?';
      } else {
        transcript += '.';
      }
    }
    this.finalTranscript = transcript;
    this.userInput = transcript;
  }

  adjustConfidence(value: number): void {
    this.confidenceThreshold = Math.max(0, Math.min(1, value));
  }

  parseMessage(text: string): SafeHtml {
    // Convert markdown bold syntax (**text**) into <strong> tags
    let formatted = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Split the message into individual lines
    const lines = formatted.split('\n');
    let result = '';
    let listOpen = false;

    // Process each line: if it starts with a bullet marker, wrap it in list tags; otherwise, wrap it in a paragraph
    for (let line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('- ')) {
        if (!listOpen) {
          result += '<ul>';
          listOpen = true;
        }
        result += `<li>${trimmedLine.substring(2)}</li>`;
      } else {
        if (listOpen) {
          result += '</ul>';
          listOpen = false;
        }
        if (trimmedLine) {
          result += `<p>${trimmedLine}</p>`;
        }
      }
    }
    if (listOpen) {
      result += '</ul>';
    }

    // Return the formatted HTML after sanitization
    return this.sanitizer.bypassSecurityTrustHtml(result);
  }

  loadChatHistory(): void {
    this.isLoading = true;
    this.responseService.getMessages().subscribe({
      next: (messages) => {
        this.messages = messages;
        this.scrollToBottom();
      },
      error: (error) => {
        console.error('Error loading chat history:', error);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  sendMessage(): void {
    if (!this.userInput.trim()) return;

    // Stop recognition if it is running
    if (this.isListening) {
      if (this.pauseTimer) {
        clearTimeout(this.pauseTimer);
      }
      this.recognition.stop();
      this.isListening = false;
    }

    const userMessage: Message = {
      type: 'user',
      text: this.userInput,
      time: new Date().toISOString()
    };

    // Update UI immediately
    this.messages.push(userMessage);
    this.scrollToBottom();
    this.isLoading = true;

    const messageText = this.userInput;
    this.userInput = '';
    this.finalTranscript = '';
    this.interimTranscript = '';

    // Reset textarea height and focus it back
    if (this.messageInput) {
      const textareaElement = this.messageInput.nativeElement;
      textareaElement.style.height = 'auto';
      textareaElement.style.height = '38px';
      setTimeout(() => {
        textareaElement.focus();
      }, 0);
    }

    // Send message to backend
    this.responseService.sendMessage(messageText).subscribe({
      next: (response) => {
        this.messages.push(response);
        this.scrollToBottom();
      },
      error: (error) => {
        console.error('Error sending message:', error);
        this.messages.push({
          type: 'bot',
          text: 'Sorry, I encountered an error processing your request. Please try again later.',
          time: new Date().toISOString()
        });
        this.scrollToBottom();
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat(): void {
    this.isLoading = true;
    this.responseService.clearChat().subscribe({
      next: () => {
        this.messages = [];
      },
      error: (error) => {
        console.error('Error clearing chat history:', error);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  scrollToBottom(): void {
    requestAnimationFrame(() => {
      if (this.messagesArea) {
        const element = this.messagesArea.nativeElement;
        const wasAtBottom = element.scrollHeight - element.clientHeight <= element.scrollTop + 1;
        if (wasAtBottom || this.messages.length <= 1 ||
            this.messages[this.messages.length - 1]?.type === 'user') {
          setTimeout(() => {
            element.scrollTop = element.scrollHeight;
          }, 10);
        }
      }
    });
  }

  initScrollListener(): void {
    if (this.messagesArea) {
      const element = this.messagesArea.nativeElement;
      element.addEventListener('scroll', () => {
        // Let the user control scrolling; auto-scroll only when appropriate.
      });
    }
  }
}
