import * as pdfjsLib from 'pdfjs-dist/webpack';

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.js";
