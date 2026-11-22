import { createRoot } from 'react-dom/client'
import { App } from './editor/app'
import { openProjectStore } from './projects/indexed-db'
import './style.css'

const root = document.getElementById('root')
if (!root) throw new Error('Brakuje kontenera aplikacji.')
createRoot(root).render(<App openStore={openProjectStore} />)
