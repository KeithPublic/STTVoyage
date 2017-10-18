import * as React from "react";
import * as ReactDOM from "react-dom";

import STTApi from 'sttapi';
import { CONFIG } from 'sttapi';

function rgbToHex(r: number, g: number, b: number): string {
    return "#" + ((b | g << 8 | r << 16) / 0x1000000).toString(16).substring(2);
}

const rarityRes = [
    { name: 'Basic', color: 'Grey' },
    { name: 'Common', color: rgbToHex(155, 155, 155) },
    { name: 'Uncommon', color: rgbToHex(80, 170, 60) },
    { name: 'Rare', color: rgbToHex(90, 170, 255) },
    { name: 'Super Rare', color: rgbToHex(170, 45, 235) },
    { name: 'Legendary', color: rgbToHex(253, 210, 106) }
];

interface IVoyageLogEntryProps {
    log: any;
}

class VoyageLogEntry extends React.Component<any, IVoyageLogEntryProps> {
    when: string;

    constructor(props: IVoyageLogEntryProps) {
        super(props);

        let minutes = (Date.now() / 1000 - this.props.entry.event_time) / 60;
        if (minutes > 2) {
            this.when = minutes.toFixed(0) + ' minutes ago';
        }
        else {
            this.when = 'just now';
        }
    }

    render() {
        return (<div className='event'>
            {this.props.entry.crewIconUrl && (
                <div className='label'>
                    <img src={this.props.entry.crewIconUrl} />
                </div>
            )}

            <div className='content'>
                <div className='summary'>
                    {this.props.entry.skill_check && (
                        <span>
                            <img className="ui image skillImage" src={CONFIG.SPRITES['icon_' + this.props.entry.skill_check.skill].url} />
                            {(this.props.entry.skill_check.passed == true) ? <i className='check circle icon' /> : <i className='minus circle icon' />}
                        </span>
                    )}

                    <span dangerouslySetInnerHTML={{ __html: this.props.entry.text }} />
                    <div className="date">{this.when}</div>
                </div>
            </div>
        </div>
        );
    }
}

interface IVoyageLogState {
    dataLoaded: boolean;
    voyage: any;
    voyageNarrative: any;
    antimatter: number;
    lastDilemmaNotification: number;
}

export class VoyageLog extends React.Component<any, IVoyageLogState> {
    timerID: any;
    _antimatterstatistic: any;

    constructor() {
        super();

        this.state = {
            dataLoaded: false,
            voyage: undefined,
            voyageNarrative: undefined,
            antimatter: 0,
            lastDilemmaNotification: 0
        };

        this._recall = this._recall.bind(this);
        this._revive = this._revive.bind(this);
        this._saveLog = this._saveLog.bind(this);
        this._chooseDilemma = this._chooseDilemma.bind(this);
        this.reloadState = this.reloadState.bind(this);
        this.animateAntimatter = this.animateAntimatter.bind(this);

        this.reloadState();
    }

    animateAntimatter() {
        if (this._antimatterstatistic) {
            this._antimatterstatistic.className = 'value';

            // Magic sauce :) This triggers a reflow which tricks the browser into replaying the animation
            void this._antimatterstatistic.offsetWidth;

            this._antimatterstatistic.className = 'value shakeAnimation';
        }
    }

    reloadState() {
        if (STTApi.playerData.character.voyage && STTApi.playerData.character.voyage.length > 0) {
            STTApi.loadVoyage(STTApi.playerData.character.voyage[0].id, false).then((voyageNarrative) => {
                // TODO: some log entries have 2 crew; how do I display those?
                voyageNarrative.forEach((entry: any) => {
                    if (entry.crew) {
                        let rc = STTApi.roster.find((rosterCrew: any) => rosterCrew.symbol == entry.crew[0]);
                        if (rc) {
                            entry.crewIconUrl = rc.iconUrl;
                        }
                    }
                });

                voyageNarrative = voyageNarrative.reverse();

                if (STTApi.playerData.character.voyage[0].ship_name == null) {
                    STTApi.playerData.character.voyage[0].ship_name = STTApi.ships.find((ship: any) => ship.id == STTApi.playerData.character.voyage[0].ship_id).name;
                }

                if ((STTApi.playerData.character.voyage[0].hp < 100) &&
                    ((this.state.antimatter >= 100) || !this.state.antimatter) &&
                    (STTApi.playerData.character.voyage[0].state != "recalled")) {
                    (window as any).showLocalNotification("WARNING: You only have " + STTApi.playerData.character.voyage[0].hp + " antimatter left. Consider recalling your voyage!");
                }

                if (STTApi.playerData.character.voyage[0].dilemma && STTApi.playerData.character.voyage[0].dilemma.id) {
                    if (this.state.lastDilemmaNotification != STTApi.playerData.character.voyage[0].dilemma.id) {
                        (window as any).showLocalNotification("WARNING: A new dilemma is available: " + STTApi.playerData.character.voyage[0].dilemma.title + ". Choose an action now!");
                    }
                }

                this.setState({
                    dataLoaded: true,
                    voyage: STTApi.playerData.character.voyage[0],
                    antimatter: STTApi.playerData.character.voyage[0].hp,
                    voyageNarrative: voyageNarrative,
                    lastDilemmaNotification: STTApi.playerData.character.voyage[0].dilemma ? STTApi.playerData.character.voyage[0].dilemma.id : 0
                });

                this.animateAntimatter();
            });
        }
    }

    _recall() {
        STTApi.recallVoyage(STTApi.playerData.character.voyage[0].id).then(() => {
            this.reloadState();
        });
    }

    _revive() {
        STTApi.reviveVoyage(STTApi.playerData.character.voyage[0].id).then(() => {
            this.reloadState();
        });
    }

    _chooseDilemma(voyageId: number, dilemmaId: number, index: number) {
        STTApi.resolveDilemma(voyageId, dilemmaId, index).then(() => {
            this.reloadState();

            // Remove the dilemma that was just resolved
            STTApi.playerData.character.voyage[0].dilemma = null;
        });
    }

    _saveLog() {
        (window as any).showLogSavePicker(this.state.voyageNarrative);
    }

    componentDidMount() {
        this.timerID = setInterval(this.reloadState, 20000);
    }

    componentWillUnmount() {
        clearInterval(this.timerID);
    }

    renderVoyageState(): JSX.Element {
        if (this.state.voyage.state == "recalled") {
            return <p>Voyage is returning and will be complete in {Math.floor(this.state.voyage.recall_time_left / 60)} minutes.</p>;
        } else if (this.state.voyage.state == "failed") {
            return <p>Voyage has run out of antimatter after {Math.floor(this.state.voyage.voyage_duration / 60)} minutes and it's waiting to be abandoned or replenished.</p>;
        } else {
            return <p>Voyage has been ongoing for {Math.floor(this.state.voyage.voyage_duration / 60)} minutes (new dilemma in {Math.floor((this.state.voyage.seconds_between_dilemmas - this.state.voyage.seconds_since_last_dilemma) / 60)} minutes).</p>;
        }
    }

    renderDilemma(): JSX.Element[] {
        if (this.state.voyage.dilemma && this.state.voyage.dilemma.id) {
            return [<h3 key={0} className="ui top attached header"><span dangerouslySetInnerHTML={{ __html: this.state.voyage.dilemma.title }} /></h3>,
            <div key={1} className="ui center aligned inverted attached segment">
                <div><span dangerouslySetInnerHTML={{ __html: this.state.voyage.dilemma.intro }} /></div>
                <div className="ui middle aligned selection list inverted">
                    {this.state.voyage.dilemma.resolutions.map((resolution: any, index: number) => {
                        return (<div className="item" key={index} onClick={() => this._chooseDilemma(this.state.voyage.id, this.state.voyage.dilemma.id, index)}>
                            <img className="ui image skillImage" style={{ display: 'inline-block' }} src={CONFIG.SPRITES['icon_' + resolution.skill].url} />
                            <div className="content">
                                <div className="header"><span dangerouslySetInnerHTML={{ __html: resolution.option }} /></div>
                            </div>
                        </div>);
                    })}
                </div>
            </div>];
        } else {
            return [<span />];
        }
    }

    renderRewards() {
        return (
            <div className="ui inverted segments">
                <div className="ui inverted segment">
                    <div className="ui list">
                    {this.state.voyage.pending_rewards.loot.filter((loot: any) => loot.type == 1).map((loot: any, index: number) => {
                        let rating: JSX.Element[] = [];
                        for (let i = 0; i < loot.rarity; i++) {
                            rating.push(<i key={i} className='yellow star icon' />);
                        }

                        let have: any = STTApi.roster.find((crew: any) => crew.symbol == loot.symbol);
                        let duplicate: JSX.Element[] = [];
                        let duplicateColor: string = 'red';
                        if (have) {
                            duplicate.push(<span>DUPLICATE</span>);

                            for (let i = 0; i < have.rarity; i++) {
                                duplicate.push(<i key={i} className='yellow star icon' />);
                            }
                            for (let i = 0; i < have.max_rarity - have.rarity; i++) {
                                duplicate.push(<i key={i + 5} className='grey star icon' />);
                            }

                            if (have.max_rarity - have.rarity > 0) {
                                duplicateColor = 'green';
                            }
                        }

                        return (<div className="item" key={index}>
                            <img className="ui avatar image" src={STTApi.crewAvatars.find((crew: any) => crew.id == loot.id).iconUrl} />
                            <div className="content">
                                <div className="header" style={{ color: loot.rarity && rarityRes[loot.rarity].color }}>{loot.full_name}</div>
                                <div className="description" style={{ color: duplicateColor }} >{rating} {duplicate}</div>
                            </div>
                        </div>);
                    })}
                    </div>
                </div>

                <div className="ui inverted segment">
                    {this.state.voyage.pending_rewards.loot.filter((loot: any) => loot.type == 2).map((loot: any, index: number) => {
                        return (<span key={index} style={{ color: loot.rarity && rarityRes[loot.rarity].color }}>{loot.quantity} {(loot.rarity == null) ? '' : rarityRes[loot.rarity].name} {loot.full_name}</span>);
                    }).reduce((prev: any, curr: any) => [prev, ', ', curr])}
                </div>

                <div className="ui inverted segment">
                    {this.state.voyage.pending_rewards.loot.filter((loot: any) => loot.type == 3).map((loot: any, index: number) => {
                        return (<span key={index} style={{ color: loot.rarity && rarityRes[loot.rarity].color }}>{loot.quantity} {(loot.rarity == null) ? '' : rarityRes[loot.rarity].name} {loot.full_name}</span>);
                    }).reduce((prev: any, curr: any) => [prev, ', ', curr])}
                </div>
            </div>);
    }

    renderExtraButtons() {
        if (this.state.voyage.state == "failed") {
            return (<button className="ui right labeled icon button" onClick={() => this._revive()}>
                <i className="right money icon"></i>
                Revive for {this.state.voyage.revive_cost.amount} dilithium
                </button>);
        }
        else if (this.state.voyage.state == "recalled") {
            return (<button className="ui right labeled icon button" onClick={() => this._saveLog()}>
                <i className="right download icon"></i>
                Save this log...
                </button>);
        }
        else {
            return (<div>
                <button className="ui right labeled icon button" onClick={() => this._recall()}>
                    <i className="right history icon"></i>
                    Recall now
                </button><br/><br/>
                <div className="ui blue small label">Estimated time left: {Math.floor(this.state.voyage.hp / 21)} minutes</div>
                <div className="ui blue small label">Estimated revival cost: {Math.floor((this.state.voyage.voyage_duration / 60 + this.state.voyage.hp / 21) / 5)} dilithium</div>
            </div>);
        }
    }

    render() {
        if (this.state.dataLoaded) {
            return (<div style={{ userSelect: 'initial' }}>
                <h3>Voyage on the {STTApi.getShipTraitName(this.state.voyage.ship_trait)} ship {this.state.voyage.ship_name}</h3>
                {this.renderVoyageState()}

                <div className="ui center aligned inverted segment">
                    <div className={this.state.voyage.hp > 100 ? "ui teal inverted statistic" : "ui red inverted statistic"}>
                        <div className="value" ref={(antimatterstatistic) => this._antimatterstatistic = antimatterstatistic}>
                            {this.state.voyage.hp}
                        </div>
                        <div className="label">
                            Antimatter
                        </div>
                    </div>
                    <br />
                    {this.renderExtraButtons()}
                </div>

                {this.renderDilemma()}

                <h3>Pending rewards</h3>
                {this.renderRewards()}

                <h3>Complete Captain's Log</h3>
                <div className="ui feed">
                    {this.state.voyageNarrative.map((entry: any) => {
                        return <VoyageLogEntry key={entry.index + entry.text} entry={entry} />;
                    })}
                </div>
            </div>);
        }
        else {
            return (<div className="ui segment">
                <div className="ui active inverted dimmer">
                    <div className="ui text loader">Loading voyage details...</div>
                </div>
                <p>&nbsp;</p>
                <p>&nbsp;</p>
                <p>&nbsp;</p>
            </div>);
        }
    }
}