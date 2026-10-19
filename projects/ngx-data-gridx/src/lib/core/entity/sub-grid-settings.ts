import {Type} from '@angular/core';

export class SubGridSettings{
  suburl?:string;
  subUrlParams?: { paramName: string; columnName: string }[] | null;
  subGridProps?: subGridPropsDTO;
  autoRefreshIntervalSec?: number | null;
  detailComponent?: Type<any>;
  title?: string | ((row: object) => string | null | undefined);
  constructor(params: SubGridPropertiesDTO) {
    this.subUrlParams = params.subUrlParams || null;
    this.subGridProps = params.subGridProps || {};
    this.suburl = params.suburl || '';
    this.detailComponent         = params.detailComponent;
    this.autoRefreshIntervalSec = params.autoRefreshIntervalSec || null;
    this.title = params.title;
  }
}


export interface SubGridPropertiesDTO{
  suburl?:string;
  subUrlParams?: { paramName: string; columnName: string }[] | null;
  subGridProps?: subGridPropsDTO
  autoRefreshIntervalSec?: number | null;
  detailComponent?: Type<any>;
  title?: string | ((row: object) => string | null | undefined);
}

export interface subGridPropsDTO {
  multiselect?: boolean;
  limit?: number;
  sidx?: string;
  search?: boolean;
  showFilters?: boolean
}
