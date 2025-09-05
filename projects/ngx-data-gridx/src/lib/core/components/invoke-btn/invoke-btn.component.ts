import {Component, EventEmitter, Input, Output} from '@angular/core';
import {NgClass, NgStyle} from '@angular/common';
import {MatMenu, MatMenuTrigger} from "@angular/material/menu";
import {Router, RouterLink} from "@angular/router";
import {MatProgressSpinner} from '@angular/material/progress-spinner';
import {MatIcon} from '@angular/material/icon';

@Component({
  selector: 'app-invoke-btn',
  standalone: true,
  imports: [
    NgStyle,
    NgClass,
    MatMenuTrigger,
    MatMenu,
    RouterLink,
    MatProgressSpinner,
    MatIcon,
  ],
  templateUrl: './invoke-btn.component.html',
  styleUrl: './invoke-btn.component.scss'
})
export class InvokeBtnComponent {
  @Input() additionalStyles?: Partial<CSSStyleDeclaration>;
  @Output() modalRequested = new EventEmitter<string>();

  @Input() isDisabled = false;
  @Input() isHidden = false;

  @Input() type: ButtonType['type'] = 'button';
  @Input() iconName = '';

  @Input() iconWidth = 12;
  @Input() iconHeight = 12;

  @Input() target = '';
  @Input() link = '';
  @Input() dropdownItems: DropdownItemsType[] = [];
  @Input() outlined = false;

  protected isLoading = false;

  constructor(private router: Router) {
  }

  openLink(path?: string, target?: string, modalId?: string) {
    if (modalId) {
      this.modalRequested.emit(modalId);
      return;
    }

    const pathUrl = path || this.link;

    if (pathUrl) {
      if (target === '_blank') {
        window.open(pathUrl, '_blank');
      } else if (target === '_self') {
        this.router.navigateByUrl(pathUrl);
      } else {
        window.location.href = pathUrl;
      }
    }
  }

  showLoader(): void {
    this.isLoading = true;
  }

  hideLoader(): void {
    this.isLoading = false;
  }
}

export interface ButtonType {
  type: 'button' | 'link' | 'dropdown';
}

export interface DropdownItemsType {
  label: string,
  path?: string,
  target?: string,
  component?: string,
  data?: DropdownDataType,
  modalId?: string;
}

export interface DropdownDataType {
  url: string,
  data: object,
  grid_name: string
}
