/**
 * RTMuni: Real-Time Muni
 * Non-customizable code: for commuting between Castro and Montgomery stations in San Francisco
 */
'use strict';

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View
} from 'react-native';

const apiKey = 'f806f31e-9150-41c5-9220-84a09776bb60';

export default class Muni extends Component {

  constructor(props) {
    super(props);
    this.state = {properties: null};
  }

  componentDidMount() {
    this.fetchAndCollateResponses();
  }

  async fetchAndCollateResponses() {
    try {
      // fetch data from API
      let castroKTLMjson = await fetch(`http://api.511.org/transit/StopMonitoring?api_key=${apiKey}&agency=sf-muni&format=json&stopCode=15728`);
      let churchJjson = await fetch(`http://api.511.org/transit/StopMonitoring?api_key=${apiKey}&agency=sf-muni&format=json&stopCode=14006`);
      let churchNjson = await fetch(`http://api.511.org/transit/StopMonitoring?api_key=${apiKey}&agency=sf-muni&format=json&stopCode=14448`);
      let churchKTLMjson = await fetch(`http://api.511.org/transit/StopMonitoring?api_key=${apiKey}&agency=sf-muni&format=json&stopCode=15726`);
      // let montgOutjson = await fetch(`http://api.511.org/transit/StopMonitoring?api_key=${apiKey}&agency=sf-muni&format=json&stopCode=16994`);
      let missOutjson = await fetch(`http://api.511.org/transit/StopMonitoring?api_key=${apiKey}&agency=sf-muni&format=json&stopCode=15529`);
      let vanNessjson = await fetch(`http://api.511.org/transit/StopMonitoring?api_key=${apiKey}&agency=sf-muni&format=json&stopCode=16996`);
      let vanNessFjson = await fetch(`http://api.511.org/transit/StopMonitoring?api_key=${apiKey}&agency=sf-muni&format=json&stopCode=15696`);
      let church37uphilljson = await fetch(`http://api.511.org/transit/StopMonitoring?api_key=${apiKey}&agency=sf-muni&format=json&stopCode=17073`);
      let church37alongMarketjson = await fetch(`http://api.511.org/transit/StopMonitoring?api_key=${apiKey}&agency=sf-muni&format=json&stopCode=13255`);
      let castro33json = await fetch(`http://api.511.org/transit/StopMonitoring?api_key=${apiKey}&agency=sf-muni&format=json&stopCode=13325`);
      let castro37json = await fetch(`http://api.511.org/transit/StopMonitoring?api_key=${apiKey}&agency=sf-muni&format=json&stopCode=15667`);

      // deserialize responses
      let castroKTLM = await castroKTLMjson.json();
      let churchJ = await churchJjson.json();
      let churchN = await churchNjson.json();
      let churchKTLM = await churchKTLMjson.json();
      // let montgOut = await montgOutjson.json();
      let missOut = await missOutjson.json();
      let vanNess = await vanNessjson.json();
      let vanNessF = await vanNessFjson.json();
      let church37uphill = await church37uphilljson.json();
      let church37alongMarket = await church37alongMarketjson.json();
      let castro33 = await castro33json.json();
      let castro37 = await castro37json.json();
      
      // decorate predictions object with route-specific predictions
      const predictions = {};
      predictions.castroIn = await this.parseJson(castroKTLM);
      predictions.churchUndergroundIn = await this.parseJson(churchKTLM);
      predictions.churchJIn = await this.parseJson(churchJ);
      predictions.churchNIn = await this.parseJson(churchN);
      // skipping Montgomery for now; to add, copy patterns above or below
      predictions = await this.parseJsonMult(predictions, missOut, '14', 'miss14Out', '14R', 'miss14ROut');
      predictions = await this.parseJsonMult(predictions, vanNess, 'KT', 'vanNessKTOut', 'L', 'vanNessLOut', 'M', 'vanNessMOut', 'J', 'vanNessJOut', 'N', 'vanNessNOut');
      let tempKTLM = predictions.vanNessKTOut.split(',').concat(predictions.vanNessLOut.split(','), predictions.vanNessMOut.split(','));
      tempKTLM.sort((a,b) => {
        return Number(a) - Number(b);
      });
      predictions.vanNessKTLMOut = tempKTLM.join(',');
      predictions.vanNessFOut = await this.parseJson(vanNessF);
      predictions.church37uphillOut = await this.parseJson(church37uphill);
      predictions.church37alongMarketOut = await this.parseJson(church37alongMarket);
      predictions.castro33Out = await this.parseJson(castro33);
      predictions.castro37Out = await this.parseJson(castro37);
      let unix = Date.parse(vanNess.ServiceDelivery.ResponseTimestamp);
      let date = new Date(unix);
      let hours = date.getHours() > 12 ? date.getHours() - 12 : date.getHours();
      let minutes = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
      let seconds = date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds();
      predictions.fetchTime = `${hours}:${minutes}:${seconds}`;

      // set state
      this.setState({predictions: predictions});
    } catch(err) {
      console.error(err);
    }
  }

  parseJson(obj) {
    return obj.ServiceDelivery.StopMonitoringDelivery.MonitoredStopVisit.map(element => {
      let pred = Date.parse(element.MonitoredVehicleJourney.MonitoredCall.AimedArrivalTime);
      let curr = Date.parse(element.RecordedAtTime);
      let mins = (pred-curr)/(1000*60);
      return mins > 3 ? Math.floor(mins) : (Math.floor(mins*10))/10;
    }).join(',');
  }

  parseJsonMult(preds, obj, ...args) {
    const temp = {};
    for (let i=0; i < args.length; i++) {
      if (i % 2 === 0) {
        let newObj = {};
        newObj.name = args[i+1];
        newObj.arr = [];
        temp[args[i]] = newObj;
      }
    }
    obj.ServiceDelivery.StopMonitoringDelivery.MonitoredStopVisit.forEach(element => {
      let pred = Date.parse(element.MonitoredVehicleJourney.MonitoredCall.AimedArrivalTime);
      let curr = Date.parse(element.RecordedAtTime);
      let mins = (pred-curr)/(1000*60);
      temp[element.MonitoredVehicleJourney.LineRef].arr.push(mins > 3 ? Math.floor(mins) : (Math.floor(mins*10))/10);
    });
    for (let route in temp) {
      preds[temp[route].name] = temp[route].arr.join(',');
    }
    return preds;
  }

  render() {
    if (!this.state.predictions) {
      return this.renderLoading();
    }
    return this.renderPredictions(this.state.predictions);
  }

  renderLoading() {
    return (
      <View style={styles.container}>
        <Text>
          Fetching predictions...
        </Text>
      </View>
      );
  }

renderPredictions(predictions) {
    return (
      <View style={styles.container}>
        <Text style={styles.main}>
          Inbound &#8226; Headed Downtown
        </Text>
        <Text style={styles.header}>
          Castro Station
        </Text>
        <Text style={styles.route}>
          {predictions.castroIn}
        </Text>
        <Text style={styles.header}>
          Church Station & Stops
        </Text>
        <Text style={styles.route}>
          <Text style={styles.highlight}>KT-L-M:</Text> {predictions.churchUndergroundIn}
        </Text>
        <Text style={styles.route}>
          <Text style={styles.highlight}>J at Church/Duboce:</Text> {predictions.churchJIn}
        </Text>
        <Text style={styles.route}>
          <Text style={styles.highlight}>N at Duboce/Church:</Text> {predictions.churchNIn}
        </Text>
        <Text style={styles.main}>
          Outbound &#8226; Headed Home
        </Text>
        <Text style={styles.header}>
          Mission @ 2nd Stop
        </Text>
        <Text style={styles.route}>
          <Text style={styles.highlight}>14:</Text> {predictions.miss14Out + '\n'}
          <Text style={styles.highlight}>14R:</Text> {predictions.miss14ROut}
        </Text>
        <Text style={styles.header}>
          Van Ness Station & Stop
        </Text>
        <Text style={styles.route}>
          <Text style={styles.highlight}>KTLM:</Text> {predictions.vanNessKTLMOut + '\n'}
          <Text style={styles.highlight}>J:</Text> {predictions.vanNessJOut + '\n'}
          <Text style={styles.highlight}>N:</Text> {predictions.vanNessNOut + '\n'}
          <Text style={styles.highlight}>F:</Text> {predictions.vanNessFOut}
        </Text>
        <Text style={styles.header}>
          Church Stops
        </Text>
        <Text style={styles.route}>
          <Text style={styles.highlight}>37 uphill:</Text> {predictions.church37uphillOut}
        </Text>
        <Text style={styles.route}>
          <Text style={styles.highlight}>37 along Market:</Text> {predictions.church37alongMarketOut}
        </Text>
        <Text style={styles.header}>
          Castro Stops
        </Text>
        <Text style={styles.route}>
          <Text style={styles.highlight}>33 at 18th/Castro:</Text> {predictions.castro33Out}
        </Text>
        <Text style={styles.route}>
          <Text style={styles.highlight}>37 at Market/Castro:</Text> {predictions.castro37Out}
        </Text>
        <Text style={styles.timestamp}>
          &nbsp; &nbsp; Fetched: {predictions.fetchTime} &nbsp; &nbsp;
        </Text>
      </View>
    );
  }
};

var styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: '#F5FCFF',
  },
  timestamp: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '400',
    textAlign: 'right',
    backgroundColor: '#f40',
    marginTop: 12,
  },
  main: {
    fontSize: 20,
    color: '#4e3e41',
    fontWeight: '900',
    textAlign: 'left',
    marginTop: 10,
    // backgroundColor: '#CCCCFF',
  },
  header: {
    fontSize: 20,
    color: '#3cf',
    fontWeight: '800',
    textAlign: 'left',
    margin: 10,
  },
  route: {
    fontSize: 18,
    textAlign: 'left',
    color: '#333333',
    marginBottom: 5,
  },
  highlight: {
    backgroundColor: '#e5f9ff',
  }
});

AppRegistry.registerComponent('Muni', () => Muni);