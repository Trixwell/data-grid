import {Component, input, signal, ViewEncapsulation} from '@angular/core';
import {MatIcon} from '@angular/material/icon';

@Component({
    selector: 'grid-text-truncate',
    standalone: true,
    imports: [MatIcon],
    templateUrl: './grid-text-truncate.component.html',
    styleUrl: './grid-text-truncate.component.scss',
    encapsulation: ViewEncapsulation.None,
})
export class GridTextTruncateComponent {
    text = input.required<string>();
    limit = input.required<number>();

    expanded = signal(false);

    toggle(event: MouseEvent): void {
        event.stopPropagation();
        this.expanded.set(!this.expanded());
    }
}
