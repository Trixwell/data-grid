import {Component, input, ViewEncapsulation} from '@angular/core';
import {RouterLink} from '@angular/router';
import {GridTextTruncateComponent} from '../grid-text-truncate/grid-text-truncate.component';

@Component({
  selector: 'grid-router-link',
  standalone: true,
  imports: [RouterLink, GridTextTruncateComponent],
  templateUrl: './grid-router-link.component.html',
  styleUrl: './grid-router-link.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class GridRouterLinkComponent {
  link = input.required<string>();
  text = input.required<string>();
  textLimit = input<number | undefined>();
}
