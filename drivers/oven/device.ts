import Homey from 'homey';
import ElectroluxAEGApp from '../../app'
import stringify from 'json-stringify-safe';


class OvenDevice extends Homey.Device {
  app!: ElectroluxAEGApp

  async onInit() {
    this.log('OvenDevice has been initialized');

    // Add missing capabilities when upgrading
    for (const cap of ["EXECUTE_command","LIGHT_onoff"]) {
      if (!this.hasCapability(cap)) {
        this.log("Migrating device from old version: Adding capability " + cap);
        await this.addCapability(cap);
      }
    }

    this.app = this.homey.app as ElectroluxAEGApp
    const deviceId = this.getData().id;
    const state = await this.app.getApplianceState(deviceId);

    this.log('********* applianceState ********');
    this.log(stringify(state));
    this.log('**********************************');

    const capabilities = await this.app.getApplianceCapabilities(deviceId);
    this.log(`********** capabilities **********`);
    this.log(stringify(capabilities));
    this.log('**********************************');

    // Listen to multiple capabilities simultaneously
    this.registerMultipleCapabilityListener(
      [
        "LIGHT_onoff",
        "EXECUTE_command"
      ],
      (valueObj, optsObj) => this.setDeviceOpts(valueObj),
      500
    );
  }

  async setDeviceOpts(valueObj: { [x: string]: any }) {
    const deviceId = this.getData().id;

    try {

      // Update EXECUTE_command
      if (valueObj.EXECUTE_command !== undefined) {
        this.log("EXECUTE_command: " + valueObj.EXECUTE_command);
        await this.app.sendDeviceCommand(deviceId, { executeCommand: valueObj.EXECUTE_command });
      }

      const commandMapping: { [x: string]: string } = {
        LIGHT_onoff: "cavityLight",
      };

      // Update other capabilities
      const capabilitiesToUpdate = [
        "LIGHT_onoff",
      ];

      for (const cap of capabilitiesToUpdate) {
        if (valueObj[cap] !== undefined) {
          const apiCommandName = commandMapping[cap] || cap;

          await this.app.sendDeviceCommand(deviceId, {
            [apiCommandName]: valueObj[cap],
          });
          this.log(`${cap}: ${valueObj[cap]}`);

        }
      }
    } catch (error) {
      this.log(`Error in setDeviceOpts: ${error}`);
    }
  }

  async updateCapabilityValues(state: any) {
    if (!state.properties || !state.properties.reported) {
      this.log("Device data is missing or incomplete");
      return;
    }

    const props = state.properties.reported;

    try {
      await this.setCapabilityValue("LIGHT_onoff", props.cavityLight);
      await this.setCapabilityValue("measure_doorState", props.doorState);
      await this.setCapabilityValue("measure_timeToEnd", this.convertSecondsToHrMin(props.runningTime));
      await this.setCapabilityValue("measure_stopTime", this.convertSecondsToHrMin(props.timeToEnd)); // in seconds 
      await this.setCapabilityValue("measure_startTime", this.convertSecondsToHrMin(props.startTime));
      await this.setCapabilityValue("measure_targetTemperature", props.targetTemperatureC);
      await this.setCapabilityValue("measure_temperature", props.displayTemperatureC);
      await this.setCapabilityValue("measure_applianceState", props.applianceState);
      await this.setCapabilityValue("measure_applianceMode", props.program);
      await this.setCapabilityValue("measure_cyclePhase", props.processPhase);

      this.log("Device data updated");
    } catch (error) {
      this.log("Error updating device state: ", error);
    }

  }

  convertSecondsToHrMin(seconds: number) {
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

  flow_enable_cavity_light(args: {}, state: {}) {
    return this.setDeviceOpts({ LIGHT_onoff: true });
  }

  flow_disable_cavity_light(args: {}, state: {}) {
    return this.setDeviceOpts({ LIGHT_onoff: false });
  }

  flow_execute_command(args: {what: string}, state: {}) {
    return this.setDeviceOpts({ EXECUTE_command: args.what });
  }
  
}

module.exports = OvenDevice;
