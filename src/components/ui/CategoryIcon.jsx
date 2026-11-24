import {
  Smartphone, Laptop, Server, Cpu, Monitor, Tablet, Watch, Headphones, Speaker, Gamepad2,
  Keyboard, Camera, Router, Home, Plug, BatteryCharging, HardDrive, Package,
} from 'lucide-react'

const map = {
  smartphone: Smartphone, laptop: Laptop, server: Server, cpu: Cpu, monitor: Monitor, tablet: Tablet,
  watch: Watch, headphones: Headphones, speaker: Speaker, gamepad: Gamepad2, keyboard: Keyboard,
  camera: Camera, router: Router, home: Home, plug: Plug, battery: BatteryCharging, drive: HardDrive, package: Package,
}

export default function CategoryIcon({ name, ...props }) {
  const Icon = map[name] || Package
  return <Icon {...props} />
}
