import { APP_STAGE, APP_VERSION } from '../config'
import './Footer.css'

const appStage = APP_STAGE
const appVersion = APP_VERSION

export default function Footer() {
  return (
    <footer className="app-footer">
      <div>Stage: {appStage}</div>
      <div>Version: {appVersion}</div>
    </footer>
  )
}
