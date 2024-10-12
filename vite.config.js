import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
    base: "./",
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                model1: resolve(__dirname, 'public/model1.html'),
            }
        }
    }
})
