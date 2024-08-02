import Homey from 'homey';
import ElectroluxAEGApp from '../../app'
import stringify from 'json-stringify-safe';


class LaundryDevice extends Homey.Device {
  app!: ElectroluxAEGApp

  async onInit() {
    this.log('LaundryDevice has been initialized');


    // Removed old capabilities when upgrading
    for (const cap of ["EXECUTE_command"]) {
      if (this.hasCapability(cap)) {
        this.log("Migrating device from old version: Removing capability " + cap);
        await this.removeCapability(cap);
      }
    }

    // Add missing capabilities when upgrading
    for (const cap of ["execute_command"]) {
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
        "execute_command"
      ],
      (valueObj, optsObj) => this.setDeviceOpts(valueObj),
      500
    );
  }

  async setDeviceOpts(valueObj: { [x: string]: any }) {
    const deviceId = this.getData().id;

    try {

      // Update execute_command
      if (valueObj.execute_command !== undefined) {
        this.log("execute_command: " + valueObj.execute_command);
        await this.app.sendDeviceCommand(deviceId, { executeCommand: valueObj.execute_command });
      }

      /*
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
      */

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
      await this.setCapabilityValue("measure_doorState", props.doorState);
      await this.setCapabilityValue("measure_timeToEnd", this.convertSecondsToMinNumber(props.timeToEnd));
      await this.setCapabilityValue("measure_stopTime", this.convertSecondsToHrMinString(props.stopTime)); // in seconds 
      await this.setCapabilityValue("measure_startTime", this.convertSecondsToHrMinString(props.startTime));
      await this.setCapabilityValue("measure_applianceState", props.applianceState);
      await this.setCapabilityValue("measure_applianceMode", props.applianceMode);
      await this.setCapabilityValue("measure_cyclePhase", props.cyclePhase);
    } catch (error) {
      this.log("Error updating device state: ", error);
    }
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


  flow_execute_command(args: { what: string }, state: {}) {
    this.log(`flow_cyclePhase_is: args=${stringify( args.what)} state=${stringify(state)}`);
    return this.setDeviceOpts({ execute_command: args.what });
  }

  flow_cyclePhase_is(args: { value: string }, state: {}) {
    this.log(`flow_cyclePhase_is: args=${stringify(args.value)} state=${stringify(state)}`);
    return args.value === this.getCapabilityValue("measure_cyclePhase");
  }

  flow_applianceState_is(args: { value: string }, state: {}) {
    this.log(`flow_applianceState_is: args=${stringify(args.value)} state=${stringify(state)}`);
    return args.value === this.getCapabilityValue("measure_applianceState");
  }
}

module.exports = LaundryDevice;