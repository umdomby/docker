import 'react';

declare module 'react' {
    interface VideoHTMLAttributes<T> extends HTMLAttributes<T> {
        srcObject?: MediaStream | null;
    }
}