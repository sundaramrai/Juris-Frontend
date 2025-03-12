import { Component, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FeedbackService } from '../../services/feedback.service';

@Component({
  selector: 'app-feedback',
  standalone: false,
  templateUrl: './feedback.component.html',
  styleUrls: ['./feedback.component.css']
})
export class FeedbackComponent {
  feedbackForm: FormGroup;
  ratings = [1, 2, 3, 4, 5];
  isSubmitting = false;
  successPopup = false;

  constructor(private fb: FormBuilder, private feedbackService: FeedbackService) {
    this.feedbackForm = this.fb.group({
      satisfaction: [null, Validators.required],
      issues: ['', [Validators.required, Validators.minLength(5)]],
      improvements: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  setSatisfaction(rating: number) {
    this.feedbackForm.patchValue({ satisfaction: rating });
  }

  submitFeedback() {
    if (this.feedbackForm.invalid) return;

    this.isSubmitting = true;

    this.feedbackService.sendFeedback(this.feedbackForm.value).subscribe(
      () => {
        this.successPopup = true; // Show popup
        this.feedbackForm.reset();
        this.isSubmitting = false;

        // Hide popup after 3 seconds
        setTimeout(() => {
          this.successPopup = false;
        }, 3000);
      },
      () => {
        this.isSubmitting = false;
      }
    );
  }

  // Close popup when user clicks outside of the success message
  closePopup(event: Event) {
    if ((event.target as HTMLElement).classList.contains('popup-overlay')) {
      this.successPopup = false;
    }
  }
}
