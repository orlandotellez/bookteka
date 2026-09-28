export interface UploadBookRequestDTO {
  title?: string;
  author?: string;
  readingTimeSeconds?: string;
  scrollPosition?: string;
  currentPage?: string;
}
export interface DeleteBookParamsDTO {
  id: string;
}

export interface UpdateBookParamsDTO {
  id: string
}

export interface DownloadBookParamsDTO {
  id: string
}

export interface StreamBookParamsDTO {
  id: string
}
