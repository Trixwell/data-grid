import {
  Component,
  ComponentRef,
  input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  Type,
  ViewContainerRef
} from '@angular/core';

@Component({
  selector: 'grid-cell-host',
  imports: [],
  templateUrl: './grid-cell-host.html',
  styleUrl: './grid-cell-host.scss'
})
export class GridCellHost implements OnChanges, OnDestroy{
  component = input<Type<any> | undefined>();
  row = input<any>();

  private ref?: ComponentRef<any>;

  constructor(private vcr: ViewContainerRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    const component = this.component();
    if (!component) {
      this.clear(); return;
    }

    if (!this.ref || this.ref.componentType !== component) {
      this.clear();
      this.ref = this.vcr.createComponent(component);
    }

    this.ref.setInput?.('row', this.row());
    this.ref.changeDetectorRef.detectChanges();
  }

  ngOnDestroy(): void {
    this.clear();
  }

  private clear() {
    this.vcr.clear();
    this.ref?.destroy();
    this.ref = undefined;
  }
}
