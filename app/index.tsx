import * as React from "react";
import * as ReactDOM from "react-dom";

import { LoginDialog } from "./loginDialog";
import { VoyageLog } from "./VoyageLog";
import { FileImageCache } from "./FileImageCache";

import STTApi from 'sttapi';
import { CONFIG, loginSequence } from 'sttapi';

enum Tab {
    VoyageLog,
    Crew,
    Feedback
}

interface IAppState {
    dataLoaded: boolean;
    showSpinner: boolean;
    loggedIn: boolean;
    captainName: string;
    spinnerLabel: string;
    captainAvatarUrl: string | undefined;
    filter: string;
    currentTab: Tab;
}

//https://semantic-ui.com/elements/image.html#size
class App extends React.Component<any, IAppState> {
    userFeedback: any;

    constructor() {
        super();

        this._onAccessToken = this._onAccessToken.bind(this);
        this._renderVoyageLogPage = this._renderVoyageLogPage.bind(this);
        this._renderFeedbackPage = this._renderFeedbackPage.bind(this);
        this._sendFeedback = this._sendFeedback.bind(this);

        this.state = {
            showSpinner: false,
            dataLoaded: false,
            loggedIn: false,
            captainName: 'Welcome',
            captainAvatarUrl: '',
            currentTab: Tab.VoyageLog,
            filter: '',
            spinnerLabel: 'Loading data...',
        };

        this.userFeedback = {
			feature: '',
			bug: '',
			other: '',
			nameSuggestion: 'VoyageMonitor 0.1.0',
			email: '',
		};

        STTApi.setImageProvider(true, new FileImageCache());

        STTApi.loginWithCachedAccessToken().then((success) => {
            if (success) {
                this._onAccessToken();
            }
            else {
                this.setState({ loggedIn: false });
            }
        });
    }

    render() {
        if (!this.state.loggedIn) {
            return <LoginDialog onAccessToken={this._onAccessToken} />;
        }
        return (<div>
            {this.state.showSpinner && (
                <div className="ui segment">
                    <div className="ui active inverted dimmer">
                        <div className="ui massive text loader">{this.state.spinnerLabel}</div>
                    </div>
                    <p>&nbsp;</p>
                    <p>&nbsp;</p>
                    <p>&nbsp;</p>
                    <p>&nbsp;</p>
                    <p>&nbsp;</p>
                    <p>&nbsp;</p>
                </div>
            )}

            {this.state.dataLoaded && (
                <div>
                    <div className="ui fixed inverted menu">
                        <div className="ui container">
                            <div className="ui simple dropdown item">
                                <img className="logo tiny" src={this.state.captainAvatarUrl} />
                                {this.state.captainName}
                                <div className="ui small teal right label">{STTApi.playerData.character.level}</div>

                                <div className="menu">
                                    <div className="item">
                                        <div className="ui label black">
                                            DBID: {STTApi.playerData.dbid}
                                        </div>

                                        <div className="ui label black">
                                            Location: {STTApi.playerData.character.navmap.places.find((place: any) => { return place.symbol == STTApi.playerData.character.location.place; }).display_name}
                                        </div>

                                        <br/><br/>

                                        <div className="ui label black">
                                            <img src={CONFIG.SPRITES['energy_icon'].url} className="ui inline image" />&nbsp;
                                            {Math.min(Math.floor(STTApi.playerData.character.seconds_from_replay_energy_basis / STTApi.playerData.character.replay_energy_rate), STTApi.playerData.character.replay_energy_max) + STTApi.playerData.character.replay_energy_overflow}
                                        </div>

                                        <div className="ui label black">
                                            <img src={CONFIG.SPRITES['images_currency_pp_currency_0'].url} className="ui inline image" />&nbsp;
                                            {STTApi.playerData.premium_purchasable}
                                        </div>

                                        <div className="ui label black">
                                            <img src={CONFIG.SPRITES['images_currency_pe_currency_0'].url} className="ui inline image" />&nbsp;
                                            {STTApi.playerData.premium_earnable}
                                        </div>

                                        <br/><br/>

                                        <div className="ui label black">
                                            <img src={CONFIG.SPRITES['images_currency_honor_currency_0'].url} className="ui inline image" />&nbsp;
                                            {STTApi.playerData.honor}
                                        </div>

                                        <div className="ui label black">
                                            <img src={CONFIG.SPRITES['images_currency_sc_currency_0'].url} className="ui inline image" />&nbsp;
                                            {STTApi.playerData.money}
                                        </div>

                                        <div className="ui label black">
                                            <img src={CONFIG.SPRITES['cadet_icon'].url} className="ui inline image" />&nbsp;
                                            {STTApi.playerData.character.cadet_tickets.current} / {STTApi.playerData.character.cadet_tickets.max}
                                        </div>

                                        <br/><br/>

                                        <button className="ui primary button" onClick={() => this.setState({loggedIn: false})}>Logout</button>
                                    </div>
                                </div>
                            </div>
                            <a className="item" onClick={() => this.setState({currentTab: Tab.VoyageLog})} ><i className="film icon"></i> Voyage</a>
                            <a className="item" onClick={() => this.setState({currentTab: Tab.Crew})} ><i className="users icon"></i> Crew</a>
                            <a className="item" onClick={() => this.setState({currentTab: Tab.Feedback})} ><i className="help icon"></i> About</a>
                        </div>
                    </div>

                    <div className="ui main container" style={{ marginTop: '4em' }} >
                        {(this.state.currentTab == Tab.VoyageLog) && this._renderVoyageLogPage()}
                        {(this.state.currentTab == Tab.Crew) && this._renderCrewPage()}
                        {(this.state.currentTab == Tab.Feedback) && this._renderFeedbackPage()}
                    </div>
                </div>
            )}
        </div>);
    }

    _renderVoyageLogPage() {
        return <VoyageLog />;
    }

    _renderCrewPage() {
        let actualShip: any = STTApi.ships.find((ship: any) => ship.id == STTApi.playerData.character.voyage[0].ship_id);
        if (STTApi.playerData.character.voyage[0].ship_name == null) {
            STTApi.playerData.character.voyage[0].ship_name = actualShip.name;
        }

        return (<div>
            <h4>Voyage on the {STTApi.getShipTraitName(STTApi.playerData.character.voyage[0].ship_trait)} ship {STTApi.playerData.character.voyage[0].ship_name}</h4>
            <img className="ui medium image" src={actualShip.iconUrl} />

            <h4>Full crew complement</h4>
            <div className="ui list">
                {STTApi.playerData.character.voyage[0].crew_slots.map((slot: any) => {
                    return (<div className="item" key={slot.symbol}>
                        <img className="ui avatar image" src={STTApi.roster.find((rosterCrew: any) => rosterCrew.id == slot.crew.archetype_id).iconUrl} />
                        <div className="content">
                            <div className="header">{slot.crew.name}</div>
                            <div className="description">{slot.name}</div>
                        </div>
                    </div>);
                })}
            </div>

            <h4>Skill aggregates</h4>
            <div className="ui list">
                {Object.keys(STTApi.playerData.character.voyage[0].skill_aggregates).map((skillKey: any) => {
                    let skill = STTApi.playerData.character.voyage[0].skill_aggregates[skillKey];
                    return (<div className="item" key={skill.skill}>
                        <img className="ui image skillImage" src={CONFIG.SPRITES['icon_' + skill.skill].url} />

                        <div className="content">
                            <div className="header">{skill.core} ({skill.range_min}-{skill.range_max})</div>
                        </div>
                    </div>);
                })}
            </div></div>);
    }

    _sendFeedback() {
		STTApi.submitUserFeedback(this.userFeedback).then(() => {
            (window as any).showLocalNotification('Thank you for your feedback!\nAll feedback helps me prioritize my work to deliver the most value.');
		});
	}

    _renderFeedbackPage() {
        return <div className="ui text container">
            <h2 className="ui header">Star Trek Timelines Voyage Monitor v0.1.5</h2>
            <p>A tool to help with voyages in Star Trek Timelines</p>
            <p><b>DISCLAIMER</b> This tool is provided "as is", without warranty of any kind. Use at your own risk! It should be understood that <i>Star Trek Timelines</i> content and materials are trademarks and copyrights of <a href='https://www.disruptorbeam.com/tos/' target='_blank'>Disruptor Beam, Inc.</a> or its licensors. All rights reserved. This tool is neither endorsed by nor affiliated with Disruptor Beam, Inc.</p>
            <p>For details about this tool, see the <a href='https://github.com/IAmPicard/STTVoyage' target='_blank'>GitHub page</a>. For information about other tools for Star Trek Timelines, see <a href='https://iampicard.github.io/' target='_blank'>here</a>.</p>

            <h3 className="ui teal header">
                <div className="content">Your feedback is appreciated</div>
            </h3>
            <div className="ui form">
                <div className="ui segment">
                    <div className="field">
                        <label>What would you like to see implemented next</label>
                        <textarea rows={2} name="feature" placeholder="Your #1 feature request" onChange={(event: any) => this.userFeedback.feature = event.target.value } />
                    </div>

                    <div className="field">
                        <label>Bug, or something you'd want to be implemented differently</label>
                        <textarea rows={2} name="bug" placeholder="Your #1 annoyance" onChange={(event: any) => this.userFeedback.bug = event.target.value } />
                    </div>

                    <div className="field">
                        <label>Any other feedback</label>
                        <textarea rows={2} name="other" placeholder="" onChange={(event: any) => this.userFeedback.other = event.target.value } />
                    </div>

                    <div className="field">
                        <label>(Optional) Your e-mail address</label>
                        <input type="text" name="email" placeholder="" onChange={(event: any) => this.userFeedback.email = event.target.value } />
                    </div>
                    <div>I won't share this with anyone; I'll only use it to contact you if I have questions about your feedback</div>
                    <br/>
                    <div className="ui fluid teal submit button" onClick={this._sendFeedback}>Send feedback</div>
                </div>
            </div>
        </div>;
    }

    _onAccessToken() {
        this.setState({ loggedIn: true, showSpinner: true });

        loginSequence((progressLabel) => this.setState({ spinnerLabel: progressLabel }), false)
            .then(() => {
                this.setState({
                    captainName: STTApi.playerData.character.display_name,
                    showSpinner: false,
                    dataLoaded: true
                });

                if (STTApi.playerData.character.crew_avatar) {
                    STTApi.imageProvider.getCrewImageUrl(STTApi.playerData.character.crew_avatar, false, 0).then(({ id, url }) => {
                        this.setState({ captainAvatarUrl: url });
                    }).catch((error) => { });
                }
            })
            .catch((error: any) => { });
    }
}

ReactDOM.render(<App />, document.getElementById("content"));