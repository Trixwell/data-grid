import {
  AfterViewInit,
  Directive,
  ElementRef,
  EventEmitter,
  Host,
  Input,
  OnChanges,
  Optional,
  Output,
  Renderer2,
  Self,
  SimpleChanges,
} from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { map, startWith } from 'rxjs';


@Directive({
  selector: '[appSquarePagination]',
  standalone: true,
})
export class SquarePaginatorDirective implements AfterViewInit, OnChanges {
  @Output() pageIndexChangeEmitter: EventEmitter<number> =
    new EventEmitter<number>();

  @Input() showFirstButton = true;
  @Input() showLastButton = true;

  @Input() renderButtonsNumber = 2;
  @Input() appCustomLength: number = 0;

  @Input() hideDefaultArrows = false;

  private dotsEndRef!: HTMLElement;
  private dotsStartRef!: HTMLElement;
  private squareContainerRef!: HTMLElement;

  private buttonsRef: HTMLElement[] = [];

  constructor(
    @Host() @Self() @Optional() private readonly matPag: MatPaginator,
    private elementRef: ElementRef,
    private ren: Renderer2
  ) {}

  ngAfterViewInit(): void {
    this.styleDefaultPagination();
    this.createsquareDivRef();
    this.renderButtons();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes?.['appCustomLength']?.firstChange) {
      this.removeButtons();
      this.switchPage(0);
      this.renderButtons();
    }
  }

  private renderButtons(): void {
    this.buildButtons();

    this.matPag.page
      .pipe(
        map((e) => [e.previousPageIndex ?? 0, e.pageIndex]),
        startWith([0, 0])
      )
      .subscribe(([prev, curr]) => {
        this.changeActiveButtonStyles(prev, curr);
      });
  }

  private changeActiveButtonStyles(previousIndex: number, newIndex: number) {
    if(!this.buttonsRef.length){
      return;
    }

    const previouslyActive = this.buttonsRef[previousIndex];
    const currentActive = this.buttonsRef[newIndex];

    this.ren.removeClass(previouslyActive, 'g-square__active');
    this.ren.addClass(currentActive, 'g-square__active');
    this.buttonsRef.forEach((button) =>
      this.ren.setStyle(button, 'display', 'none')
    );

    const renderElements = this.renderButtonsNumber;
    const endDots = newIndex < this.buttonsRef.length - renderElements - 1;
    const startDots = newIndex - renderElements > 0;

    const firstButton = this.buttonsRef[0];
    const lastButton = this.buttonsRef[this.buttonsRef.length - 1];

    if (this.showLastButton) {
      this.ren.setStyle(this.dotsEndRef, 'display', endDots ? 'block' : 'none');
      this.ren.setStyle(lastButton, 'display', endDots ? 'flex' : 'none');
    }

    if (this.showFirstButton) {
      this.ren.setStyle(
        this.dotsStartRef,
        'display',
        startDots ? 'block' : 'none'
      );
      this.ren.setStyle(firstButton, 'display', startDots ? 'flex' : 'none');
    }

    const startingIndex = startDots ? newIndex - renderElements : 0;

    const endingIndex = endDots
      ? newIndex + renderElements
      : this.buttonsRef.length - 1;

    for (let i = startingIndex; i <= endingIndex; i++) {
      const button = this.buttonsRef[i];
      this.ren.setStyle(button, 'display', 'flex');
    }
  }

  private styleDefaultPagination() {
    const nativeElement = this.elementRef.nativeElement;
    const itemsPerPage = nativeElement.querySelector(
      '.mat-mdc-paginator-page-size'
    );
    const howManyDisplayedEl = nativeElement.querySelector(
      '.mat-mdc-paginator-range-label'
    );
    const previousButton = nativeElement.querySelector(
      'button.mat-mdc-paginator-navigation-previous'
    );
    const nextButtonDefault = nativeElement.querySelector(
      'button.mat-mdc-paginator-navigation-next'
    );

    this.ren.setStyle(itemsPerPage, 'display', 'none');

    this.ren.setStyle(howManyDisplayedEl, 'position', 'absolute');
    this.ren.setStyle(howManyDisplayedEl, 'left', '0');
    this.ren.setStyle(howManyDisplayedEl, 'color', '#919191');
    this.ren.setStyle(howManyDisplayedEl, 'font-size', '14px');

    if (this.hideDefaultArrows) {
      this.ren.setStyle(previousButton, 'display', 'none');
      this.ren.setStyle(nextButtonDefault, 'display', 'none');
    }
  }

  private createsquareDivRef(): void {
    const actionContainer = this.elementRef.nativeElement.querySelector(
      'div.mat-mdc-paginator-range-actions'
    );
    const nextButtonDefault = this.elementRef.nativeElement.querySelector(
      'button.mat-mdc-paginator-navigation-next'
    );

    this.squareContainerRef = this.ren.createElement('div') as HTMLElement;
    this.ren.addClass(this.squareContainerRef, 'g-square-container');

    this.ren.insertBefore(
      actionContainer,
      this.squareContainerRef,
      nextButtonDefault
    );
  }

  private buildButtons(): void {
    const neededButtons = Math.ceil(
      this.appCustomLength / this.matPag.pageSize
    );


    if (neededButtons < 1) {
      this.ren.setStyle(this.elementRef.nativeElement, 'display', 'none');
      return;
    }

    this.buttonsRef = [this.createButton(0)];

    this.dotsStartRef = this.createDotsElement();

    for (let index = 1; index < neededButtons - 1; index++) {
      this.buttonsRef = [...this.buttonsRef, this.createButton(index)];
    }

    this.dotsEndRef = this.createDotsElement();

    this.buttonsRef = [
      ...this.buttonsRef,
      this.createButton(neededButtons - 1),
    ];
  }

  private removeButtons(): void {
    this.buttonsRef.forEach((button) => {
      this.ren.removeChild(this.squareContainerRef, button);
    });

    if (this.dotsStartRef) {
      this.ren.removeChild(this.squareContainerRef, this.dotsStartRef);
    }

    if (this.dotsEndRef) {
      this.ren.removeChild(this.squareContainerRef, this.dotsEndRef);
    }

    this.buttonsRef.length = 0;
  }


  private createButton(i: number): HTMLElement {
    const squareButton = this.ren.createElement('div');
    const text = this.ren.createText(String(i + 1));

    // add class & text
    this.ren.addClass(squareButton, 'g-square');
    this.ren.appendChild(squareButton, text);

    // react on click
    this.ren.listen(squareButton, 'click', () => {
      this.switchPage(i);
    });

    // render on UI
    this.ren.appendChild(this.squareContainerRef, squareButton);

    // set style to hidden by default
    this.ren.setStyle(squareButton, 'display', 'none');

    return squareButton;
  }


  private createDotsElement(): HTMLElement {
    const dotsEl = this.ren.createElement('span');
    const dotsText = this.ren.createText('...');

    this.ren.setStyle(dotsEl, 'font-size', '18px');
    this.ren.setStyle(dotsEl, 'margin-right', '8px');
    this.ren.setStyle(dotsEl, 'padding-top', '6px');
    this.ren.setStyle(dotsEl, 'color', '#919191');

    this.ren.appendChild(dotsEl, dotsText);

    this.ren.appendChild(this.squareContainerRef, dotsEl);

    this.ren.setStyle(dotsEl, 'display', 'none');

    return dotsEl;
  }


  private switchPage(i: number): void {
    const previousIndex = this.matPag.pageIndex;
    this.matPag.pageIndex = i;

    this.matPag.page.next({
      previousPageIndex: previousIndex,
      pageIndex: i,
      pageSize: this.matPag.pageSize,
      length: this.appCustomLength
    });

    this.pageIndexChangeEmitter.emit(i);
  }
}
