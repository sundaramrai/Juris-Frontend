import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatSelectChange } from '@angular/material/select';

@Component({
  selector: 'app-templates',
  standalone: false,
  templateUrl: './templates.component.html',
  styleUrls: ['./templates.component.css']
})
export class TemplatesComponent implements OnInit {
  templatesData = {
    templates: [
      {
        "template_name": "Non-Disclosure Agreement (NDA) for Business",
        "about": "A Non-Disclosure Agreement (NDA) is a legally binding contract that establishes a confidential relationship.",
        "key": "nda",
        "file": ["../../../assets/docs/nda.docx", "../../../assets/docs/nda.pdf"],
        "type": "business"
      },
      {
        "template_name": "Employment Contract",
        "about": "An employment contract is a legal agreement between an employer and an employee which includes any details relevant to the employment arrangement.",
        "key": "employment_contract",
        "file": ["../../../assets/docs/employment_contract.docx", "../../../assets/docs/employment_contract.pdf"],
        "type": "business"
      },
      {
        "template_name": "Freelance/Consultancy Agreement",
        "about": "A Freelance/Consultancy Agreement is a legal document that outlines the terms of a freelance or consultancy engagement.",
        "key": "freelance_agreement",
        "file": ["../../../assets/docs/freelance_agreement.docx", "../../../assets/docs/freelance_agreement.pdf"],
        "type": "business"
      },
      {
        "template_name": "Partnership Deed",
        "about": "A Partnership Deed is a legal document that outlines the rights and responsibilities of all parties to a business partnership.",
        "key": "partnership_deed",
        "file": ["../../../assets/docs/partnership_deed.docx", "../../../assets/docs/partnership_deed.pdf"],
        "type": "business"
      },
      {
        "template_name": "Memorandum of Understanding (MoU)",
        "about": "A Memorandum of Understanding (MoU) is a document that describes the broad outlines of an agreement that two or more parties have reached.",
        "key": "mou",
        "file": ["../../../assets/docs/mou.docx", "../../../assets/docs/mou.pdf"],
        "type": "business"
      },
      {
        "template_name": "Service Agreement",
        "about": "A Service Agreement is a contract between a service provider and a client that outlines the terms of the service to be provided.",
        "key": "service_agreement",
        "file":  ["../../../assets/docs/service_agreement.docx", "../../../assets/docs/service_agreement.pdf"],
        "type": "business"
      },
      {
        "template_name": "Franchise Agreement",
        "about": "A Franchise Agreement is a legal document that binds a franchisor and franchisee together in a business relationship.",
        "key": "franchise_agreement",
        "file": ["../../../assets/docs/franchise_agreement.docx", "../../../assets/docs/franchise_agreement.pdf"],
        "type": "business"
      },
      {
        "template_name": "Joint Venture Agreement",
        "about": "A Joint Venture Agreement is a contract between two or more parties who agree to combine resources for a specific business purpose.",
        "key": "joint_venture_agreement",
        "file": ["../../../assets/docs/joint_venture_agreement.docx", "../../../assets/docs/joint_venture_agreement.pdf"],
        "type": "business"
      },
      {
        "template_name": "Shareholders Agreement",
        "about": "A Shareholders Agreement is a contract among a company's shareholders describing how the company should be operated and the shareholders' rights and obligations.",
        "key": "shareholders_agreement",
        "file": ["../../../assets/docs/shareholders_agreement.docx", "../../../assets/docs/shareholders_agreement.pdf"],
        "type": "business"
      },
      {
        "template_name": "Articles of Association",
        "about": "Articles of Association are a document that specifies the regulations for a company's operations and defines the company's purpose.",
        "key": "articles_of_association",
        "file": ["../../../assets/docs/articles_of_association.docx", "../../../assets/docs/articles_of_association.pdf"],
        "type": "business"
      },
      {
        "template_name": "Company Incorporation Documents",
        "about": "Company Incorporation Documents are the legal documents required to form a corporation.",
        "key": "company_incorporation_documents",
        "file": ["../../../assets/docs/company_incorporation_documents.docx", "../../../assets/docs/company_incorporation_documents.pdf"],
        "type": "business"
      },
      {
        "template_name": "Sale Deed (For Property)",
        "about": "A Sale Deed is a legal document that transfers the ownership of property from one party to another.",
        "key": "sale_deed",
        "file": ["../../../assets/docs/sale_deed.docx", "../../../assets/docs/sale_deed.pdf"],
        "type": "property"
      },
      {
        "template_name": "Lease Agreement",
        "about": "A Lease Agreement is a legal document that outlines the terms under which one party agrees to rent property from another party.",
        "key": "lease_agreement",
        "file": ["../../../assets/docs/lease_agreement.docx", "../../../assets/docs/lease_agreement.pdf"],
        "type": "property"
      }
    ]
  };

  selectedType: string = 'all';
  availableTypes: string[] = [];
  filteredTemplates: any[] = [];
  searchControl = new FormControl('');
  isLoaded: boolean = false;

  // Pagination variables
  currentPage: number = 1;
  templatesPerPage: number = 4;

  constructor() { }

  ngOnInit(): void {
    // Collect unique types
    this.availableTypes = Array.from(
      new Set(this.templatesData.templates.map(t => t.type))
    );

    // Initialize filteredTemplates
    this.filteredTemplates = this.templatesData.templates;
    this.loadSuccess();

    // Subscribe to search input changes
    this.searchControl.valueChanges.subscribe(searchTerm => {
      this.filterTemplates(this.selectedType, searchTerm || '');
      this.currentPage = 1; // reset to page 1 after search
    });
  }

  filterTemplatesByType(event: MatSelectChange) {
    this.selectedType = event.value;
    this.filterTemplates(this.selectedType, this.searchControl.value || '');
    this.currentPage = 1; // reset to page 1 after type change
    this.loadSuccess();
  }

  private filterTemplates(type: string, searchTerm: string) {
    let filtered = this.templatesData.templates;

    // Filter by type
    if (type !== 'all') {
      filtered = filtered.filter(template => template.type === type);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.template_name
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
    }

    this.filteredTemplates = filtered;
    this.loadSuccess();
  }

  // Return only the templates for the current page
  get paginatedTemplates(): any[] {
    const startIndex = (this.currentPage - 1) * this.templatesPerPage;
    const endIndex = startIndex + this.templatesPerPage;
    return this.filteredTemplates.slice(startIndex, endIndex);
  }

  // Compute total pages
  get totalPages(): number {
    return Math.ceil(this.filteredTemplates.length / this.templatesPerPage);
  }

  // Generate array of page numbers [1..totalPages]
  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  // Go to previous page
  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // Go to next page
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  // Jump to a specific page
  goToPage(page: number): void {
    this.currentPage = page;
  }

  // Example method: called when your data has finished loading
  loadSuccess() {
    this.isLoaded = true;
  }
  // Opens the PDF version of the template for viewing in a new tab
  viewTemplate(template: any): void {
    // Ensure the PDF file is available (assumed to be at index 1)
    if (template.file && template.file.length > 1) {
      window.open(template.file[1], '_blank');
    } else {
      console.error('PDF version not available for this template.');
    }
  }

  downloadFileOption(template: any, type: string): void {
    let fileUrl = '';
    if (template.file && template.file.length > 0) {
      if (type === 'pdf' && template.file.length > 1) {
        fileUrl = template.file[1]; // PDF version
      } else if (type === 'docx') {
        fileUrl = template.file[0]; // DOCX version
      } else {
        console.error('Requested file type not available.');
        return;
      }
    }
    const a = document.createElement('a');
    a.href = fileUrl;
    const extension = fileUrl.substring(fileUrl.lastIndexOf('.'));
    a.download = template.template_name + extension;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
