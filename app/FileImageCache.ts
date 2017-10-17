import { ImageCache } from 'sttapi';

export class FileImageCache implements ImageCache {
    formatUrl(url: string): string {
        return url.substr(1).replace(new RegExp('/', 'g'), '_') + '.png';
    }

    getImage(url: string): Promise<string | undefined> {
        return new Promise<string | undefined>((resolve, reject) => {
            window.resolveLocalFileSystemURL(cordova.file.dataDirectory + this.formatUrl(url), (fileEntry) => {
                console.log(fileEntry.fullPath);
                resolve(fileEntry.toURL());
            }, (error: FileError) => {
                resolve(undefined);
            });
        });
    }

    saveImage(url: string, data: Buffer): Promise<string> {
        console.log("saveImage called");
        return new Promise<string>((resolve, reject) => {
            window.resolveLocalFileSystemURL(cordova.file.dataDirectory, (directoryEntry: DirectoryEntry) => {
                directoryEntry.getFile(this.formatUrl(url), { create: true }, (fileEntry) => {
                    fileEntry.createWriter((fileWriter) => {
                        fileWriter.onwriteend = function (e) {
                            console.log(fileEntry.fullPath);
                            resolve(fileEntry.toURL());
                        };
    
                        fileWriter.onerror = function (event: ProgressEvent) {
                            console.error(event);
                            reject('Fail to write to file');
                        };
    
                        var blob = new Blob([data], { type: 'image/png' });
                        fileWriter.write(blob);
                    }, (error: FileError) => {
                        console.error(error);
                        reject('Fail to write to file');
                    });
                }, (error: FileError) => {
                    console.error(error);
                    reject('Fail to create file');
                });
            }, (error: FileError) => {
                console.error(error);
                reject('Fail to load data directory');
            });
        });
    }
}