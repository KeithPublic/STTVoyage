import * as React from "react";
import * as ReactDOM from "react-dom";
import STTApi from 'sttapi';

export interface ILoginDialogProps {
    onAccessToken: () => void;
}

export interface ILoginDialogState {
    errorMessage: string | undefined;
    autoLogin: boolean;
    showSpinner: boolean;
    username: string;
    password: string;
    facebookAccessToken: string | undefined;
    facebookUserId: string | undefined;
}

export class LoginDialog extends React.Component<ILoginDialogProps, ILoginDialogState> {
    constructor(props: ILoginDialogProps) {
        super(props);
        this.state = {
            errorMessage: undefined,
            autoLogin: true,
            showSpinner: false,
            username: '',
            password: '',
            facebookAccessToken: undefined,
            facebookUserId: undefined
        };

        this._closeDialog = this._closeDialog.bind(this);
        this._facebookLogin = this._facebookLogin.bind(this);
    }

    render() {
        return <div className="ui middle aligned center aligned">
            {this.state.errorMessage && (
                <div className="ui error message">{this.state.errorMessage}</div>
            )}

            <h2 className="ui teal header">
                <div className="content">Log-in with your account</div>
            </h2>
            <div className="ui large form">
                <div className="ui stacked segment">
                    <div className="field">
                        <div className="ui left icon input">
                            <i className="user icon"></i>
                            <input type="text" name="email" placeholder="Username (e-mail)" value={this.state.username} onChange={(event: any) => this.setState({ username: event.target.value })} />
                        </div>
                    </div>
                    <div className="field">
                        <div className="ui left icon input">
                            <i className="lock icon"></i>
                            <input type="password" name="password" placeholder="Password" value={this.state.password} onChange={(event: any) => this.setState({ password: event.target.value })} />
                        </div>
                    </div>
                    <div className="field">
                        <div className="ui checkbox">
                            <input type="checkbox" name="save" checked={this.state.autoLogin} onChange={(event: any) => this.setState({ autoLogin: event.target.checked })} />
                            <label>Stay logged in</label>
                        </div>
                    </div>
                    <div className="ui fluid large teal submit button" onClick={this._closeDialog}>Login</div>
                    <br/>
                    <div className="ui fluid large teal submit button" onClick={this._facebookLogin}>Login with Facebook...</div>
                </div>
            </div>

            <div className="ui message">
                New to Star Trek Timelines? <a href="https://www.disruptorbeam.com/games/star-trek-timelines/">Check it out</a>
            </div>

            {this.state.showSpinner && (
                <div className="ui active inverted dimmer">
                    <div className="ui small text loader">Logging in...</div>
                </div>
            )}
        </div>;
    }

    _closeDialog() {
        this.setState({ showSpinner: true, errorMessage: undefined });

        let promiseLogin: Promise<void>;
        if (this.state.facebookAccessToken) {
            promiseLogin = STTApi.loginWithFacebook(this.state.facebookAccessToken, this.state.facebookUserId, this.state.autoLogin);
        }
        else {
            promiseLogin = STTApi.login(this.state.username, this.state.password, this.state.autoLogin);
        }

        promiseLogin.then(() => {
            this.setState({ showSpinner: false });
            this.props.onAccessToken();
        })
            .catch((error: string) => {
                this.setState({ showSpinner: false, errorMessage: error });
            });
    }

    _facebookLogin() {
        var options = {
            client_id: "322613001274224",
            scopes: "public_profile",
            redirect_uri: "https://www.facebook.com/connect/login_success.html"
        };

        let facebookAuthURL: string = "https://www.facebook.com/v2.8/dialog/oauth?client_id=" + options.client_id + "&redirect_uri=" + options.redirect_uri + "&response_type=token,granted_scopes&scope=" + options.scopes + "&display=popup";
        let authWindow = cordova.InAppBrowser.open(facebookAuthURL, '_blank', 'location=no,hidden=yes');

        authWindow.addEventListener('loadstop', () => {
            authWindow.show();
        });

        authWindow.addEventListener('loadstart', (location) => {
            var raw_code = /access_token=([^&]*)/.exec(location.url) || null;
            var access_token = (raw_code && raw_code.length > 1) ? raw_code[1] : null;
            var error = /\?error=(.+)$/.exec(location.url);

            if (access_token) {
                STTApi.networkHelper.get("https://graph.facebook.com/me",
                    {
                        access_token: access_token,
                        fields: 'id,name'
                    }).then((data: any) => {
                        this.setState({
                            facebookAccessToken: access_token,
                            facebookUserId: data.id
                        }, () => {
                            this._closeDialog();
                        });
                    });

                authWindow.close();
            }
            else {
                if (location.url.indexOf('www.facebook.com/v2.8/dialog') == -1) {
                    this.setState({ errorMessage: 'Unable to authenticate with Facebook: ' + error });
                }
            }
        });

        authWindow.addEventListener('exit', () => {
            // Display an error ?
        });
    }
}