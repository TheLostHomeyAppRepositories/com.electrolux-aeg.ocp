import Homey from 'homey';
import stringify from 'json-stringify-safe';
import ElectroluxAEGApp from '../app'

export default class SharedDevice extends Homey.Device {

    app!: ElectroluxAEGApp
    static enableDebug = true;
    private refreshInterval: NodeJS.Timeout | null = null;

    async onInit() {
        this.log("Device Init: " + this.getName() );
        this.app = this.homey.app as ElectroluxAEGApp;

        const deviceId = this.getData().id;
        const state = await this.app.getApplianceState(deviceId);
        this.setSettings({ applianceState: stringify(state) });
        const capabilities = await this.app.getApplianceCapabilities(deviceId);
        this.setSettings({ applianceCapabilities: stringify(capabilities) });
    }

    async updateCapabilities() {
    }

    convertSecondsToMinNumber(seconds: number) : number {
      if (seconds < 0) return 0;
      return Math.floor(seconds / 60);
    }
  
    convertSecondsToHrMinString(seconds: number) : string {
      if (seconds < 0) return '';
      // Calculate hours, minutes, and seconds
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
  
      // Format the time into 24-hour format (HH:MM:SS)
      const formattedHours = String(hours).padStart(2, '0');
      const formattedMinutes = String(minutes).padStart(2, '0');
  
      if (hours < 1) {
        if (minutes < 2) return `${minutes} minute`;
        return `${minutes} minutes`;
      }
  
      return `${formattedHours}:${formattedMinutes}`;
    }

    onDeleted(): void {
        this.log("Device " + this.getName() + " deleted!");
    }
}

module.exports = SharedDevice;
