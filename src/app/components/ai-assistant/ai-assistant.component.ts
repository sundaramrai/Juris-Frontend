// src/app/components/ai-assistant/ai-assistant.component.ts
import { Component, ElementRef, OnInit, ViewChild, NgZone, AfterViewInit, OnDestroy } from '@angular/core';
import { ResponseService } from '../../services/response.service';
import { Message } from '../../Interface';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { jsPDF } from 'jspdf';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-ai-assistant',
  standalone: false,
  templateUrl: './ai-assistant.component.html',
  styleUrls: ['./ai-assistant.component.css']
})
export class AiAssistantComponent implements OnInit, AfterViewInit, OnDestroy {
  messages: Message[] = [];
  userInput: string = '';
  username: string | null = null;
  titleJustSaved: boolean = false;
  chatTitle: string = 'New Chat';
  chatId: string | null = null;
  isLoading: boolean = false;
  isListening: boolean = false;
  isSpeaking: boolean = false;
  chatNotFound: boolean = false;
  recognition: any;
  synthesis: SpeechSynthesis | null = null;
  synthesisVoice: SpeechSynthesisVoice | null = null;
  interimTranscript: string = '';
  finalTranscript: string = '';
  confidenceThreshold: number = 0.7;
  pauseDelay: number = 2000;
  pauseTimer: any;
  showCopied: boolean = false;
  speechSynthesisUtterance: SpeechSynthesisUtterance | null = null;
  editingTitle: boolean = false;
  tempTitle: string = '';
  private routeSub: Subscription | null = null;
  private chatIdSub: Subscription | null = null;

  @ViewChild('messagesArea') messagesArea!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;
  @ViewChild('titleInput') titleInput!: ElementRef;

  constructor(
    private responseService: ResponseService,
    private http: HttpClient,
    private ngZone: NgZone,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.initSpeechRecognition();
    this.initSpeechSynthesis();
  }

  ngOnInit(): void {
    const user = localStorage.getItem('user');
    if (user) {
      this.username = JSON.parse(user).username;
    }

    this.routeSub = this.route.queryParams.subscribe(params => {
      const newChatId = params['chatId'];
      if (newChatId) {
        this.responseService.setCurrentChatId(newChatId);
        this.loadChatHistory(newChatId);
      } else {
        this.createNewChat();
      }
    });

    this.chatIdSub = this.responseService.currentChatId$.subscribe(chatId => {
      if (chatId && chatId !== this.chatId) {
        this.chatId = chatId;
        this.loadChatHistory(chatId);
      }
    });
  }

  ngAfterViewInit(): void {
    this.initScrollListener();
  }

  ngOnDestroy(): void {
    this.stopSpeechRecognition();
    this.stopSpeechSynthesis();
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
    if (this.chatIdSub) {
      this.chatIdSub.unsubscribe();
    }
  }

  createNewChat(): void {
    this.isLoading = true;
    this.chatNotFound = false;

    this.responseService.createNewChat().subscribe({
      next: (response) => {
        this.chatId = response.chatId;
        this.chatTitle = response.title;
        this.messages = [];
        this.router.navigate(['/tools/assistant'], {
          queryParams: { chatId: response.chatId },
          replaceUrl: true
        });
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error creating new chat:', error);
        this.isLoading = false;
      }
    });
  }

  initSpeechRecognition(): void {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition ||
        (window as any).mozSpeechRecognition ||
        (window as any).msSpeechRecognition;

      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
          this.finalTranscript = '';
          this.interimTranscript = '';
        };

        this.recognition.onresult = (event: any) => {
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

          this.ngZone.run(() => {
            this.userInput = (this.finalTranscript + ' ' + this.interimTranscript).trim();
            setTimeout(() => {
              if (this.messageInput) {
                this.autoResizeTextarea(this.messageInput.nativeElement);
              }
            }, 0);
          });

          this.pauseTimer = setTimeout(() => {
            this.ngZone.run(() => {
              this.processFinalTranscript();
              if (this.isListening) {
                this.stopSpeechRecognition();
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
          this.ngZone.run(() => {
            this.isListening = false;
            this.processFinalTranscript();
          });
        };
      }
    }
  }

  toggleSpeechRecognition(): void {
    if (!this.recognition) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (this.isListening) {
      this.stopSpeechRecognition();
    } else {
      this.startSpeechRecognition();
    }
  }

  startSpeechRecognition(): void {
    if (this.isSpeaking) {
      this.stopSpeechSynthesis();
    }

    this.finalTranscript = this.userInput.trim() || '';
    this.interimTranscript = '';
    try {
      this.recognition.start();
      this.isListening = true;
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      this.stopSpeechRecognition();
      setTimeout(() => {
        try {
          this.recognition.start();
          this.isListening = true;
        } catch (retryError) {
          console.error('Error on retry speech recognition:', retryError);
          this.isListening = false;
        }
      }, 100);
    }
  }

  stopSpeechRecognition(): void {
    if (this.recognition && this.isListening) {
      if (this.pauseTimer) {
        clearTimeout(this.pauseTimer);
      }
      try {
        this.recognition.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
      this.isListening = false;
      this.ngZone.run(() => {
        this.userInput = this.finalTranscript.trim();
        setTimeout(() => {
          if (this.messageInput) {
            this.autoResizeTextarea(this.messageInput.nativeElement);
          }
        }, 0);
      });
    }
  }

  processFinalTranscript(): void {
    let transcript = this.finalTranscript.trim();
    if (transcript && !/[.!?]$/.test(transcript)) {
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

  initSpeechSynthesis(): void {
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      this.loadVoices();
      if (this.synthesis) {
        if (this.synthesis.onvoiceschanged !== undefined) {
          this.synthesis.onvoiceschanged = this.loadVoices.bind(this);
        }
      }
    }
  }

  loadVoices(): void {
    if (!this.synthesis) return;
    const voices = this.synthesis.getVoices();
    this.synthesisVoice = voices.find(voice =>
      voice.lang.includes('en-US') && voice.localService
    ) || voices.find(voice =>
      voice.lang.includes('en') && voice.localService
    ) || voices[0];

    console.log('Voice selected:', this.synthesisVoice?.name);
  }

  speakMessage(text: string): void {
    if (!this.synthesis || this.isSpeaking) return;

    if (this.isListening) {
      this.stopSpeechRecognition();
    }
    const cleanText = text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/[^\s]+/g, 'link');

    this.speechSynthesisUtterance = new SpeechSynthesisUtterance(cleanText);

    if (this.synthesisVoice) {
      this.speechSynthesisUtterance.voice = this.synthesisVoice;
    }

    this.speechSynthesisUtterance.rate = 1.0;
    this.speechSynthesisUtterance.pitch = 1.0;
    this.speechSynthesisUtterance.volume = 1.0;

    this.speechSynthesisUtterance.onstart = () => {
      this.ngZone.run(() => {
        this.isSpeaking = true;
      });
    };

    this.speechSynthesisUtterance.onend = () => {
      this.ngZone.run(() => {
        this.isSpeaking = false;
      });
    };

    this.speechSynthesisUtterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      this.ngZone.run(() => {
        this.isSpeaking = false;
      });
    };

    this.synthesis.speak(this.speechSynthesisUtterance);
  }

  stopSpeechSynthesis(): void {
    if (this.synthesis && this.isSpeaking) {
      this.synthesis.cancel();
      this.isSpeaking = false;
    }
  }

  autoResizeTextarea(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto';
    const newHeight = Math.min(150, textarea.scrollHeight);
    textarea.style.height = `${newHeight}px`;
  }

  adjustConfidence(value: number): void {
    this.confidenceThreshold = Math.max(0, Math.min(1, value));
  }

  parseMessage(text: string): SafeHtml {
    const cleanedText = text
      .split('\n')
      .map(line => line.trim())
      .join('\n');
    const sectionNames = [
      "Title",
      "Summary",
      "Relevant Legal Provisions",
      "Analysis",
      "Real life incidents",
      "Conclusion",
      "References"
    ];

    let sections: { [key: string]: string } = {};
    let currentSection = "";

    const headerRegex = new RegExp(`^(${sectionNames.join('|')})\\s*:\\s*(.*)$`, 'i');

    const lines = cleanedText.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      const headerMatch = trimmedLine.match(headerRegex);
      if (headerMatch) {
        currentSection = headerMatch[1].trim();
        sections[currentSection] = headerMatch[2].trim();
      } else if (currentSection) {
        sections[currentSection] += "\n" + trimmedLine;
      }
    }

    function processSectionContent(content: string): string {
      const contentLines = content.split('\n').map(l => l.trim()).filter(l => l !== '');
      const hasAsterisk = contentLines.some(line => line.startsWith('*'));
      if (hasAsterisk) {
        let result = "<ol type='a'>";
        for (let line of contentLines) {
          if (line.startsWith('*')) {
            const listItem = line.replace(/^\*\s*/, '');
            result += `<li>${listItem}</li>`;
          } else {
            result += `<p>${line}</p>`;
          }
        }
        result += "</ol>";
        return result;
      }
      return content;
    }

    if (Object.keys(sections).length > 0) {
      let html = "";
      if (sections["Title"]) {
        html += `<h4>${processSectionContent(sections["Title"])}</h4>`;
      }
      if (sections["Summary"]) {
        html += `<p><strong>Summary:</strong> ${processSectionContent(sections["Summary"])}</p>`;
      }
      if (sections["Relevant Legal Provisions"]) {
        html += `<p><strong>Relevant Legal Provisions:</strong> ${processSectionContent(sections["Relevant Legal Provisions"])}</p>`;
      }
      if (sections["Analysis"]) {
        html += `<p><strong>Analysis:</strong> ${processSectionContent(sections["Analysis"])}</p>`;
      }
      if (sections["Real life incidents"]) {
        html += `<p><strong>Real life incidents:</strong> ${processSectionContent(sections["Real life incidents"])}</p>`;
      }
      if (sections["Conclusion"]) {
        html += `<p><strong>Conclusion:</strong> ${processSectionContent(sections["Conclusion"])}</p>`;
      }
      if (sections["References"]) {
        html += `<p><strong>References:</strong> ${processSectionContent(sections["References"])}</p>`;
      }
      return this.sanitizer.bypassSecurityTrustHtml(html);
    } else {
      let formatted = text;
      formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      formatted = formatted.replace(/(?<!^)\*(.+?)\*/g, '<em>$1</em>');
      formatted = formatted.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');

      const fallbackLines = formatted.split('\n');
      let result = '';
      let listOpen = false;
      for (let line of fallbackLines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('*')) {
          if (!listOpen) {
            result += "<ol type='a'>";
            listOpen = true;
          }
          result += `<li>${trimmedLine.replace(/^\*\s*/, '')}</li>`;
        } else {
          if (listOpen) {
            result += "</ol>";
            listOpen = false;
          }
          if (trimmedLine) {
            result += `<p>${trimmedLine}</p>`;
          }
        }
      }
      if (listOpen) {
        result += "</ol>";
      }
      return this.sanitizer.bypassSecurityTrustHtml(result);
    }
  }

  loadChatHistory(chatId: string): void {
    this.isLoading = true;
    this.chatNotFound = false;

    this.responseService.getChatHistory(chatId).subscribe({
      next: (data) => {
        this.messages = data.messages;
        this.chatTitle = data.title;
        this.scrollToBottom();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading chat history:', error);
        if (error.status === 404) {
          console.log('Chat not found, creating new chat...');
          this.createNewChat();
        } else {
          this.createNewChat();
        }
      }
    });
  }

  sendMessage(): void {
    if (!this.userInput.trim()) return;

    if (this.isListening) {
      this.stopSpeechRecognition();
    }

    if (this.isSpeaking) {
      this.stopSpeechSynthesis();
    }

    const userMessage: Message = {
      type: 'user',
      text: this.userInput,
      time: new Date().toISOString()
    };

    this.messages.push(userMessage);
    this.scrollToBottom();
    this.isLoading = true;

    const messageText = this.userInput;
    this.userInput = '';
    this.finalTranscript = '';
    this.interimTranscript = '';

    if (this.messageInput) {
      const textareaElement = this.messageInput.nativeElement;
      textareaElement.style.height = 'auto';
      textareaElement.style.height = '38px';
      setTimeout(() => {
        textareaElement.focus();
      }, 0);
    }

    this.responseService.sendMessage(messageText, this.chatId || undefined).subscribe({
      next: (response) => {
        this.messages.push({
          type: 'bot',
          text: response.botResponse,
          time: new Date().toISOString()
        });
        if (response.title && this.chatTitle !== response.title) {
          this.chatTitle = response.title;
        }

        if (response.chatId && this.chatId !== response.chatId) {
          this.chatId = response.chatId;
          this.router.navigate(['/tools/assistant'], { queryParams: { chatId: response.chatId }, replaceUrl: true });
        }

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

  copyMessage(text: string): void {
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        this.showCopied = true;
        setTimeout(() => {
          this.showCopied = false;
        }, 1000);
      }, (error) => {
        console.error('Error copying message to clipboard:', error);
      });
    }
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat(): void {
    if (!this.chatId) return;

    this.isLoading = true;
    this.responseService.clearChat(this.chatId).subscribe({
      next: () => {
        this.createNewChat();
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
        setTimeout(() => {
          element.scrollTop = element.scrollHeight;
        }, 10);
      }
    });
  }

  initScrollListener(): void {
    if (this.messagesArea) {
      const element = this.messagesArea.nativeElement;
      element.addEventListener('scroll', () => {
        if (element.scrollTop + element.clientHeight >= element.scrollHeight) {
          this.scrollToBottom();
        }
      });
    }
  }

  startEditingTitle(): void {
    this.editingTitle = true;
    this.tempTitle = this.chatTitle;
    setTimeout(() => {
      if (this.titleInput) {
        this.titleInput.nativeElement.focus();
      }
    });
  }

  saveChatTitle(): void {
    if (!this.chatId) return;

    const newTitle = this.tempTitle.trim();
    if (!newTitle || newTitle === this.chatTitle) {
      this.editingTitle = false;
      return;
    }

    this.responseService.updateChatTitle(this.chatId, newTitle).subscribe({
      next: (response) => {
        this.chatTitle = response.title;
        this.editingTitle = false;
        this.titleJustSaved = true;
        setTimeout(() => {
          this.titleJustSaved = false;
        }, 1500);
      },
      error: (error) => {
        console.error('Error updating chat title:', error);
        this.editingTitle = false;
      }
    });
  }

  cancelEditTitle(): void {
    this.editingTitle = false;
  }

  handleTitleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveChatTitle();
    } else if (event.key === 'Escape') {
      this.cancelEditTitle();
    }
  }

  exportChatAsPDF(): void {
    try {
      const startTime = performance.now();
      console.log('Starting PDF export...');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
        precision: 16
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const textWidth = pageWidth - 2 * margin;
      const lineHeight = 7;
      const messageSpacing = 15;

      const cleanText = (text: string): string => {
        if (!text) return '';

        return text
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/?\s*p[^>]*>/gi, '\n')
          .replace(/<li[^>]*>/gi, '• ')
          .replace(/<\/li>/gi, '\n')
          .replace(/<\/?\s*(?:div|h\d|span|strong|em|ul|ol)[^>]*>/gi, '')
          .replace(/<[^>]*>?/gm, '')
          .replace(/\*\*(.+?)\*\*/g, '$1')
          .replace(/\*(.+?)\*/g, '$1')
          .replace(/`(.+?)`/g, '$1')
          .replace(/```[\s\S]*?```/g, '')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/#{1,6}\s+(.+)$/gm, '$1')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      };

      pdf.setProperties({
        title: `Chat History - ${this.chatTitle}`,
        subject: 'AI Assistant Chat Export',
        author: this.username || 'User',
        keywords: 'chat, history, export',
        creator: 'Juris AI Assistant'
      });

      pdf.setFillColor(42, 98, 195);
      pdf.rect(0, 0, pageWidth, 40, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Chat History', margin, 28);

      pdf.setFillColor(248, 249, 250);
      pdf.rect(0, 40, pageWidth, pageHeight - 40, 'F');

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Chat Information', margin, 60);

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');

      let infoY = 75;
      const infoSpacing = 10;

      const chatTitleLines = pdf.splitTextToSize(`Title: ${this.chatTitle}`, textWidth);
      pdf.text(chatTitleLines, margin, infoY);
      infoY += (chatTitleLines.length * lineHeight) + 5;

      const exportTime = new Date().toLocaleString();
      pdf.text(`Exported on: ${exportTime}`, margin, infoY);
      infoY += infoSpacing;
      if (this.username) {
        pdf.text(`User: ${this.username}`, margin, infoY);
        infoY += infoSpacing;
      }

      pdf.text(`Total messages: ${this.messages.length}`, margin, infoY);
      infoY += infoSpacing;

      if (this.messages.length > 0) {
        const firstDate = new Date(this.messages[0].time).toLocaleString();
        pdf.text(`Chat started: ${firstDate}`, margin, infoY);
        infoY += infoSpacing;

        const lastDate = new Date(this.messages[this.messages.length - 1].time).toLocaleString();
        pdf.text(`Last message: ${lastDate}`, margin, infoY);
        infoY += infoSpacing;

        const startTime = new Date(this.messages[0].time).getTime();
        const endTime = new Date(this.messages[this.messages.length - 1].time).getTime();
        const durationMs = endTime - startTime;

        if (durationMs > 0) {
          const durationMinutes = Math.floor(durationMs / 60000);
          const durationHours = Math.floor(durationMinutes / 60);
          const remainingMinutes = durationMinutes % 60;

          let durationText = '';
          if (durationHours > 0) {
            durationText = `${durationHours} hour${durationHours > 1 ? 's' : ''}`;
            if (remainingMinutes > 0) {
              durationText += ` ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
            }
          } else if (durationMinutes > 0) {
            durationText = `${durationMinutes} minute${durationMinutes > 1 ? 's' : ''}`;
          } else {
            durationText = 'less than a minute';
          }

          pdf.text(`Conversation duration: ${durationText}`, margin, infoY);
          infoY += infoSpacing;
        }
      }

      infoY += 10;
      pdf.setDrawColor(100, 100, 100);
      pdf.setLineWidth(0.3);
      pdf.line(margin, infoY - 5, pageWidth - margin, infoY - 5);
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('This document contains an exported chat history from Juris AI Assistant.', margin, infoY);
      infoY += 7;
      pdf.text('The content of this export is confidential and for personal use only.', margin, infoY);

      pdf.setFontSize(8);
      pdf.text('© ' + new Date().getFullYear() + ' Juris. All rights reserved.', margin, pageHeight - margin);

      pdf.addPage();
      let yOffset = margin;
      let currentPage = 2;

      pdf.setFillColor(235, 240, 250);
      pdf.rect(margin - 5, yOffset - 10, textWidth + 10, 20, 'F');

      pdf.setFontSize(14);
      pdf.setTextColor(60, 60, 60);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Conversation', margin, yOffset);
      yOffset += 20;

      for (let i = 0; i < this.messages.length; i++) {
        const msg = this.messages[i];
        const sender = msg.type === 'user' ? 'User' : 'Bot';
        const timeStr = new Date(msg.time).toLocaleString();
        const header = `${i + 1}. ${sender} (${timeStr}):`;

        const messageText = cleanText(msg.text);

        const headerHeight = lineHeight + 3;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        const textLines = pdf.splitTextToSize(messageText, textWidth);
        const contentHeight = textLines.length * lineHeight;

        const remainingSpace = pageHeight - margin - yOffset;
        const minimumContentToShow = headerHeight + (lineHeight * 2);

        if (remainingSpace < minimumContentToShow) {
          pdf.addPage();
          currentPage++;
          yOffset = margin;

          pdf.setFillColor(235, 240, 250);
          pdf.rect(margin - 5, yOffset - 10, textWidth + 10, 15, 'F');
          pdf.setFontSize(12);
          pdf.setTextColor(60, 60, 60);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Conversation (continued)', margin, yOffset);
          yOffset += 15;
        }

        if (msg.type === 'user') {
          pdf.setFillColor(240, 240, 240);
          pdf.setTextColor(50, 50, 50);
        } else {
          pdf.setFillColor(230, 240, 250);
          pdf.setTextColor(40, 40, 40);
        }

        pdf.setDrawColor(200, 200, 200);
        pdf.roundedRect(margin - 3, yOffset - 5, textWidth + 6, headerHeight + 4, 2, 2, 'FD');

        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(header, margin, yOffset);
        yOffset += headerHeight;

        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');

        const messageBackgroundHeight = Math.max(contentHeight + 5, 10);
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(margin - 3, yOffset - 4, textWidth + 6, messageBackgroundHeight, 1, 1, 'F');

        const maxLinesOnCurrentPage = Math.floor((pageHeight - margin - yOffset) / lineHeight);

        if (textLines.length <= maxLinesOnCurrentPage) {
          pdf.text(textLines, margin, yOffset);
          yOffset += contentHeight + messageSpacing;
        } else {
          let linesProcessed = 0;

          while (linesProcessed < textLines.length) {
            const actualLinesOnPage = Math.min(
              maxLinesOnCurrentPage,
              textLines.length - linesProcessed
            );

            const currentPageLines = textLines.slice(
              linesProcessed,
              linesProcessed + actualLinesOnPage
            );

            pdf.text(currentPageLines, margin, yOffset);
            linesProcessed += actualLinesOnPage;

            if (linesProcessed < textLines.length) {
              pdf.setFontSize(9);
              pdf.setFont('helvetica', 'italic');
              pdf.setTextColor(100, 100, 100);
              pdf.text('(Continued on next page...)', margin, pageHeight - margin);

              pdf.addPage();
              currentPage++;
              yOffset = margin;

              pdf.setFillColor(245, 245, 250);
              pdf.rect(0, 0, pageWidth, 20, 'F');

              pdf.setTextColor(80, 80, 80);
              pdf.setFontSize(10);
              pdf.setFont('helvetica', 'italic');
              pdf.text(`Message ${i + 1} (continued from previous page)`, margin, 15);

              pdf.setTextColor(0, 0, 0);
              pdf.setFontSize(10);
              pdf.setFont('helvetica', 'normal');
            } else {
              yOffset += messageSpacing;
            }
          }
        }

        if (i < this.messages.length - 1) {
          pdf.setDrawColor(210, 210, 210);
          pdf.setLineWidth(0.5);
          pdf.line(margin, yOffset - messageSpacing / 2, margin + textWidth, yOffset - messageSpacing / 2);
        }

        if (i > 0 && i % 10 === 0) {
          console.log(`Processing message ${i} of ${this.messages.length}...`);
        }
      }

      const totalPages = pdf.getNumberOfPages();
      console.log(`PDF generated with ${totalPages} pages`);

      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        if (i > 1) {
          pdf.setFillColor(245, 245, 250);
          pdf.rect(0, pageHeight - 15, pageWidth, 15, 'F');
        }
        pdf.setFontSize(9);
        pdf.setTextColor(120, 120, 120);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 25, pageHeight - 7);
        if (i > 1) {
          const shortTime = new Date().toLocaleTimeString();
          pdf.text(`Generated: ${shortTime}`, margin, pageHeight - 7);
        }
      }

      const safeTitle = this.chatTitle
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase()
        .substring(0, 30);

      const timestamp = new Date().toISOString()
        .replace(/[:.]/g, '-')
        .substring(0, 19);

      const fileName = `chat_${safeTitle}_${timestamp}.pdf`;

      pdf.save(fileName);
      const endTime = performance.now();
      const timeTaken = ((endTime - startTime) / 1000).toFixed(2);
      console.log(`PDF successfully exported in ${timeTaken} seconds with ${totalPages} pages`);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('There was a problem generating the PDF. Please try again.');
    }
  }
}
