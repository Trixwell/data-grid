export class SubGridSettings{
  suburl?:string;
  subUrlParams?: { paramName: string; columnName: string }[] | null;
  subGridProps?: subGridPropsDTO;
  autoRefreshIntervalSec?: number | null;
  constructor(params: SubGridPropertiesDTO) {
    this.subUrlParams = params.subUrlParams || null;
    this.subGridProps = params.subGridProps || {};
    this.suburl = params.suburl || '';
    this.autoRefreshIntervalSec = params.autoRefreshIntervalSec || null;
  }
}


export interface SubGridPropertiesDTO{
  suburl?:string;
  subUrlParams?: { paramName: string; columnName: string }[] | null;
  subGridProps?: subGridPropsDTO
  autoRefreshIntervalSec?: number | null;
}

export interface subGridPropsDTO {
  multiselect?: boolean;
  limit?: number;
  sidx?: string;
  search?: boolean;
  showFilters?: boolean
}
