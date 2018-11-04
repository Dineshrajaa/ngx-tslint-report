const ora = require('ora');

class Spinner {
    loaderIndicator;
    constructor() {
    }

    /**
     * Method to show spinner with a message
     * @param spinnerMessage - Spinner message to be shown
     */
    public show(spinnerMessage: string) {
        const loaderOptions = {
            'color': 'magenta',
            'spinner': 'moon',
            'text': spinnerMessage
        };
        this.loaderIndicator = ora(loaderOptions).start();
    }

    /**
     * Method to hider the spinner
     */
    public hide() {
        this.loaderIndicator.stop();
    }
}

export const spinner = new Spinner();