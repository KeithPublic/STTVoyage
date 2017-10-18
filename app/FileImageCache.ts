import { ImageCache } from 'sttapi';

export class FileImageCache implements ImageCache {
    formatUrl(url: string): string {
        return url.substr(1).replace(new RegExp('/', 'g'), '_') + '.png';
    }

    getImage(url: string): Promise<string | undefined> {
        return new Promise<string | undefined>((resolve, reject) => {
            window.resolveLocalFileSystemURL(cordova.file.dataDirectory + this.formatUrl(url), (fileEntry) => {
                resolve(fileEntry.toURL());
            }, (error: FileError) => {
                resolve(undefined);
            });
        });
    }

    bitmapToPng(data: any, callback: (blob: Blob) => void) {
		var canvas = document.createElement('canvas');
		canvas.height = data.height;
		canvas.width = data.width;

		var ctx = canvas.getContext('2d');
		var myImageData = new ImageData(new Uint8ClampedArray(data.data), data.width, data.height);
		ctx.putImageData(myImageData, 0, 0);

        if (canvas.toBlob) {
            canvas.toBlob((blob) => {
                callback(blob);
            });
        }
        else {
            callback(canvas.msToBlob());
        }
	}

    saveImage(url: string, data: any): Promise<string> {
        if (data.data.length == 0) {
            return Promise.reject('Failed to load image');
        }
        return new Promise<string>((resolve, reject) => {
            window.resolveLocalFileSystemURL(cordova.file.dataDirectory, (directoryEntry: DirectoryEntry) => {
                directoryEntry.getFile(this.formatUrl(url), { create: true }, (fileEntry) => {
                    fileEntry.createWriter((fileWriter) => {
                        fileWriter.onwriteend = function (e) {
                            resolve(fileEntry.toURL());
                        };
    
                        fileWriter.onerror = function (event: ProgressEvent) {
                            reject('Fail to write to file');
                        };
    
                        this.bitmapToPng(data, (blob: Blob) => {
                            fileWriter.write(blob);
                        });
                    }, (error: FileError) => {
                        reject('Fail to write to file');
                    });
                }, (error: FileError) => {
                    reject('Fail to create file');
                });
            }, (error: FileError) => {
                reject('Fail to load data directory');
            });
        });
    }
}