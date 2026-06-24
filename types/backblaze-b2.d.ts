declare module "backblaze-b2" {
  export interface B2Config {
    applicationKeyId: string;
    applicationKey: string;
  }

  export interface GetUploadUrlArgs {
    bucketId: string;
  }

  export interface UploadFileArgs {
    uploadUrl: string;
    uploadAuthToken: string;
    fileName: string;
    data: Buffer;
    hash: string;
    info?: Record<string, string>;
  }

  export interface DeleteFileVersionArgs {
    fileName: string;
    fileId: string;
  }

  export interface DownloadFileByNameArgs {
    bucketName: string;
    fileName: string;
    responseType?: "stream" | "arraybuffer" | "json" | "text";
  }

  export interface B2Response<T> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
  }

  export default class B2 {
    constructor(config: B2Config);
    authorize(): Promise<B2Response<{ accountId: string; authorizationToken: string; apiUrl: string; downloadUrl: string }>>;
    getUploadUrl(args: GetUploadUrlArgs): Promise<B2Response<{ uploadUrl: string; uploadAuthToken: string }>>;
    uploadFile(args: UploadFileArgs): Promise<B2Response<{ fileId: string; fileName: string; contentLength: number; contentSha1: string }>>;
    deleteFileVersion(args: DeleteFileVersionArgs): Promise<B2Response<{ fileId: string; fileName: string }>>;
    downloadFileByName(args: DownloadFileByNameArgs): Promise<B2Response<unknown>>;
  }
}
