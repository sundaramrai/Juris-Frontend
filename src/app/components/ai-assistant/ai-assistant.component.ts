import { Component, ElementRef, OnInit, ViewChild, NgZone, AfterViewInit } from '@angular/core';
import { ResponseService } from '../../services/response.service';
import { Message } from '../../Interface';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { jsPDF } from 'jspdf';

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
    // Ensure the chat scrolls to bottom once the view is fully rendered.
    this.scrollToBottom();
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

 // Enhanced parseMessage method to handle structured legal responses.
// It first removes any extraneous asterisks, then processes the text line by line.
// If headers (Title, Summary, Relevant Legal Provisions, Analysis, Real life incidents, Conclusion, References) are found,
// their content is wrapped in appropriate HTML tags. Otherwise, it falls back to markdown formatting.
parseMessage(text: string): SafeHtml {
  // Remove leading/trailing spaces and extraneous asterisks at the very start of lines (but we still need "*" markers for subpoints later).
  const cleanedText = text
    .split('\n')
    .map(line => line.trim())
    .join('\n');

  // Define the expected section headers.
  const sectionNames = [
    "Title",
    "Summary",
    "Relevant Legal Provisions",
    "Analysis",
    "Real life incidents",
    "Conclusion",
    "References"
  ];

  // Prepare an object to hold section content.
  let sections: { [key: string]: string } = {};
  let currentSection = "";

  // Regular expression to detect a header line.
  const headerRegex = new RegExp(`^(${sectionNames.join('|')})\\s*:\\s*(.*)$`, 'i');

  // Process the text line by line to capture section content.
  const lines = cleanedText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const headerMatch = line.match(headerRegex);
    if (headerMatch) {
      currentSection = headerMatch[1].trim();
      // Initialize this section with the rest of the line.
      sections[currentSection] = headerMatch[2].trim();
    } else if (currentSection) {
      // Append non-header lines to the current section, preserving newlines.
      sections[currentSection] += "\n" + line;
    }
  }

  // Helper function: Process a section's content to transform bullet points (*) into an alphabetical ordered list.
  function processSectionContent(content: string): string {
    const contentLines = content.split('\n').map(l => l.trim()).filter(l => l !== '');
    // If any line starts with "*" then assume they are subpoints.
    const hasAsterisk = contentLines.some(line => line.startsWith('*'));
    if (hasAsterisk) {
      let result = "<ol type='a'>";
      for (let line of contentLines) {
        if (line.startsWith('*')) {
          // Remove the "*" and any following whitespace.
          const listItem = line.replace(/^\*\s*/, '');
          result += `<li>${listItem}</li>`;
        } else {
          // If a line does not start with "*", output it as a paragraph.
          result += `<p>${line}</p>`;
        }
      }
      result += "</ol>";
      return result;
    }
    // If no asterisk lines, return content as is.
    return content;
  }

  // If at least one section was captured, format them.
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
    // Fallback: Apply basic markdown formatting.
    let formatted = text;
    // Bold syntax: **text**
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic syntax: *text* (avoid interfering with bullet markers by using a regex that only catches lines that are not bullet points)
    formatted = formatted.replace(/(?<!^)\*(.+?)\*/g, '<em>$1</em>');
    // Convert URLs to clickable links.
    formatted = formatted.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');

    // Process lines: if a line starts with "*" convert to alphabetical ordered list.
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
        // Always scroll to bottom when component is loaded or a new message is added.
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
        // Allow the user to control scrolling; auto-scroll only when appropriate.
      });
    }
  }

  exportChatAsPDF(): void {
    // 1) Create a new jsPDF instance (A4 size)
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Define margins
    const margin = 10; // 10mm margin on all sides
    let yOffset = margin; // start from the top margin
    const lineHeight = 7; // line spacing
    const maxTextWidth = pageWidth - 2 * margin; // text wraps within left/right margins

    pdf.setFontSize(12);

    // 3) Add a title
    pdf.setFont('helvetica', 'bold'); // Use a valid font name and style
    pdf.text('Chat History', margin, yOffset);
    yOffset += lineHeight + 3;

    // 4) Iterate over each message
    for (const msg of this.messages) {
      // Format the label, e.g. "User (time):" or "Bot (time):"
      const who = msg.type === 'user' ? 'User' : 'Bot';
      const timeStr = new Date(msg.time).toLocaleString();  // adjust as needed
      const label = `${who} (${timeStr}):`;

      // Print the label in bold
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, margin, yOffset);
      yOffset += lineHeight;

      // Print the message text in normal font, wrapped if necessary
      pdf.setFont('helvetica', 'normal');
      const wrappedText = pdf.splitTextToSize(msg.text, maxTextWidth);
      pdf.text(wrappedText, margin, yOffset);
      yOffset += wrappedText.length * lineHeight + 5;

      // If near bottom, add a new page and reset yOffset
      if (yOffset > pageHeight - margin) {
        pdf.addPage();
        yOffset = margin;
      }
    }

    // 5) Finally, save the PDF
    pdf.save('chat.pdf');
  }
}
