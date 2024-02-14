/* eslint-disable prettier/prettier */
/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Button,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import PushNotification from 'react-native-push-notification';

type cantidadType = {
  descarteGeneral: number;
  pareja: number;
  balin: number;
  descompuesta: number;
  piel: number;
  hojas: number;
  enf?: string;
};
type resultadoSumaType = {
  descarteGeneral: number;
  pareja: number;
  balin: number;
  descompuesta: number;
  piel: number;
  hojas: number;
};
type datosPredioType = {
  _id: string
  enf: string;
  nombrePredio: string;
  tipoFruta: 'Naranja' | 'Limon' | '';
};

type historialObjType = {
  enf: string;
  nombre: string;
  kilos: number;
  canastillas: number;
  fecha: Date;
};

type inventarioType = {
  balin: number
  pareja: number
  descarteGeneral: number
}

type descarteLvadoType = {
  balin: number
  pareja: number
  descarteGeneral: number
  descompuesta: number
  piel: number
  hojas: number
}


const socket = io('http://192.168.0.172:3001/');
// const socket = io('http://localhost:3005/');

export default function Form() {


  useEffect(() => {
    createChannel();
    socket.on('vaciarLote', (data: datosPredioType): void => {
      console.log(data);
      PushNotification.localNotification({
        channelId: 'channel-id-1',
        title: 'Nuevo predio vaciado', // (optional)
        message: 'Se vaceo el predio ' + data.nombrePredio + '--' + data.enf, // (required)
      });
    });
  }, []);

  const createChannel = () => {
    PushNotification.createChannel(
      {
        channelId: 'channel-id-1', // (requerido)
        channelName: 'Mi canal', // (requerido)
      },
      (created) => console.log(`createChannel returned '${created}'`) // (opcional) callback devuelve si el canal fue creado, false significa que ya existía.
    );
  };

  const [datosPredio, setDatosPredio] = useState<datosPredioType>({
    _id: '',
    enf: '',
    tipoFruta: '',
    nombrePredio: '',
  });

  const [descarteGeneralCanastillas, setDescarteGeneralCanastillas] =
    useState<string>('');
  const [descarteGeneralKilos, setDescarteGeneralKilos] = useState<string>('');
  const [parejaCanastillas, setParejaCanastillas] = useState<string>('');
  const [parejaKilos, setParejaKilos] = useState<string>('');
  const [balinCanastillas, setBalinCanastillas] = useState<string>('');
  const [balinKilos, setBalinKilos] = useState<string>('');
  const [descompuestaCanastillas, setDescompuestaCanastillas] =
    useState<string>('');
  const [descompuestaKilos, setDescompuestaKilos] = useState<string>('');
  const [pielCanastillas, setPielCanastillas] = useState<string>('');
  const [pielKilos, setPielKilos] = useState<string>('');
  const [hojasCanastillas, setHojasCanastillas] = useState<string>('');
  const [hojaskilos, setHojaskilos] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [inventario, setInventario] = useState<inventarioType>({balin:0,descarteGeneral:0,pareja:0});
  const [descarteLavado, setDescarteLavado] = useState<descarteLvadoType>({balin:0,descarteGeneral:0,pareja:0,descompuesta:0,piel:0,hojas:0});



  //Se obtienen los datos del lote que se esta vaciando, en el caso de que no se tenga el link de la api este se obtiene primero
  const obtenerLote = async (): Promise<any> => {
    try {
      setLoading(true);
      let id;
      const requestENF = { data: { collection: 'variablesDescartes', action: 'obtenerEF1Descartes' } };
      const responseServerPromise: datosPredioType = await new Promise((resolve) => {
        socket.emit('descartes', requestENF, (responseServer: datosPredioType) => {
          resolve(responseServer);
        });
      });
      id = responseServerPromise._id;

      setDatosPredio({
        _id: responseServerPromise._id,
        enf: responseServerPromise.enf,
        tipoFruta: responseServerPromise.tipoFruta,
        nombrePredio: responseServerPromise.nombrePredio,
      });
      const request = {
        data:{
          query:{
            _id: id,
          },
          select : { inventarioActual:1, descarteLavado: 1},
          populate:'',
          sort:{fechaIngreso: -1},
        },
        collection:'lotes',
        action: 'getLotes',
        query: 'proceso',
      };
       const promises: inventarioType = await new Promise((resolve) => {
        socket.emit('descartes', {data:request}, (responseInventario:{status:number,data:[{inventarioActual:{descarteLavado:inventarioType}, descarteLavado:descarteLvadoType}]}) => {
          if (responseInventario && responseInventario.data && responseInventario.data[0] && responseInventario.data[0].inventarioActual) {
            const descarteLavadoResponse:inventarioType = responseInventario.data[0].inventarioActual.descarteLavado;
            setDescarteLavado(responseInventario.data[0].descarteLavado);
            resolve(descarteLavadoResponse);
          } else {
            console.log('responseInventario, data, data[0], or inventarioActual is undefined');
          }

        });
      });
      console.log(promises);
      setInventario(promises);
    } catch (e: any) {
      Alert.alert(`${e.name}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };


  const guardarDatos = async (): Promise<any> => {
    if (datosPredio.enf === '') { return Alert.alert('Recargue el predio que se está vaciando'); }
    try {
      setLoading(true);
      //await AsyncStorage.removeItem('historial')
      let cantidad: cantidadType = await sumarDatos();
      const new_lote = {
        _id:datosPredio._id,
        descarteLavado: {
          balin: descarteLavado.balin + cantidad.balin,
          pareja: descarteLavado.pareja + cantidad.pareja,
          descarteGeneral: descarteLavado.descarteGeneral + cantidad.descarteGeneral,
          descompuesta: descarteLavado.descompuesta + cantidad.descompuesta,
          piel: descarteLavado.piel + cantidad.piel,
          hojas: descarteLavado.hojas + cantidad.hojas,
        },
        'inventarioActual.descarteLavado.balin': cantidad.balin + inventario.balin,
        'inventarioActual.descarteLavado.pareja': cantidad.pareja + inventario.pareja,
        'inventarioActual.descarteLavado.descarteGeneral': cantidad.descarteGeneral + inventario.descarteGeneral,
      };
      const request = {
        query: 'proceso',
        collection: 'lotes',
        action: 'putLotes',
        record: 'ingresoDescarteLavado',
        data: {
          lote: new_lote,
        },
      };
      socket.emit('descartes', {data:request}, (responseServer:{status:number, message:string}) => {
        console.log(responseServer);
      });

      resetarInputs();

      await guardarHistorial(cantidad);

      setLoading(false);
      Alert.alert('Guardado con exito');
    } catch (e: any) {
      Alert.alert(`${e.name}: ${e.message}`);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  //Se suman los datos, es decir las canastillas en kilos y los kilos
  const sumarDatos = async () => {
    let mult: number = 0;
    let resultado: resultadoSumaType = {
      descarteGeneral: 0,
      pareja: 0,
      balin: 0,
      descompuesta: 0,
      piel: 0,
      hojas: 0,
    };

    switch (datosPredio.tipoFruta) {
      case 'Naranja':
        mult = 19;
        break;
      case 'Limon':
        mult = 20;
        break;
    }

    if (descarteGeneralCanastillas === '') { resultado.descarteGeneral = 0; }
    else { resultado.descarteGeneral = parseFloat(descarteGeneralCanastillas) * mult; }

    if (descarteGeneralKilos === '') {
    } else { resultado.descarteGeneral += parseFloat(descarteGeneralKilos); }

    if (parejaCanastillas === '') { resultado.pareja = 0; }
    else { resultado.pareja = parseFloat(parejaCanastillas) * mult; }
    if (parejaKilos === '') {
    } else { resultado.pareja += parseFloat(parejaKilos); }

    if (balinCanastillas === '') { resultado.balin = 0; }
    else { resultado.balin = parseFloat(balinCanastillas) * mult; }
    if (balinKilos === '') {
    } else { resultado.balin += parseFloat(balinKilos); }

    if (descompuestaCanastillas === '') { resultado.descompuesta = 0; }
    else { resultado.descompuesta = parseFloat(descompuestaCanastillas) * mult; }
    if (descompuestaKilos === '') {
    } else { resultado.descompuesta += parseFloat(descompuestaKilos); }

    if (pielCanastillas === '') { resultado.piel = 0; }
    else { resultado.piel = parseFloat(pielCanastillas) * mult; }
    if (pielKilos === '') {
    } else { resultado.piel += parseFloat(pielKilos); }

    if (hojasCanastillas === '') { resultado.hojas = 0; }
    else { resultado.hojas = parseFloat(hojasCanastillas) * mult; }
    if (hojaskilos === '') {
    } else { resultado.hojas += parseFloat(hojaskilos); }

    return resultado;
  };

  const resetarInputs = () => {
    setDescarteGeneralCanastillas('');
    setDescarteGeneralKilos('');
    setParejaCanastillas('');
    setParejaKilos('');
    setBalinCanastillas('');
    setBalinKilos('');
    setDescompuestaCanastillas('');
    setDescompuestaKilos('');
    setPielCanastillas('');
    setPielKilos('');
    setHojasCanastillas('');
    setHojaskilos('');
    setDatosPredio({ enf: '', tipoFruta: '', nombrePredio: '', _id: '' });
  };

  const guardarHistorial = async (cantidad: cantidadType) => {
    try {
      //funcion que guarde el historial de descarte de forma local asyncrona
      let mult: number = 0;
      let hisotialMem: any = await AsyncStorage.getItem('historial');
      let hisotialMemoria = JSON.parse(hisotialMem);
      console.log(cantidad);
      if (hisotialMemoria == null) { hisotialMemoria = { data: [] }; }

      switch (datosPredio.tipoFruta) {
        case 'Naranja':
          mult = 19;
          break;
        case 'Limon':
          mult = 20;
          break;
      }
      console.log(hisotialMemoria);
      let historial = Object.keys(cantidad).reduce((acu: number, item) => {
        if (item !== 'enf') { acu += parseInt((cantidad as any)[item], 10); }
        return acu;
      }, 0);
      let canastillasHist = Math.ceil(historial / mult);
      let historialObj: historialObjType = {
        enf: datosPredio.enf,
        nombre: datosPredio.nombrePredio,
        kilos: historial,
        canastillas: canastillasHist,
        fecha: new Date(),
      };

      hisotialMemoria.data.unshift(historialObj);

      const jsonValue = JSON.stringify(hisotialMemoria);
      await AsyncStorage.setItem('historial', jsonValue);
    } catch (e: any) {
      Alert.alert(`${e.name}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ width: '100%' }}>
      {loading === false ? (
        <View style={styles.container}>
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>
            Descarte Lavado
          </Text>
          <Text>Numero de lote:</Text>
          <Text>{datosPredio.nombrePredio}</Text>
          <Text>{datosPredio.enf}</Text>

          <View>
            <Button
              color="#49659E"
              title="Cargar predio"
              onPress={obtenerLote}
            />
          </View>

          <Text style={{ marginTop: 10, fontSize: 15, fontWeight: 'bold' }}>
            Descarte general
          </Text>
          <TextInput
            style={styles.inputs}
            placeholder="N. de canastillas"
            inputMode="numeric"
            value={descarteGeneralCanastillas}
            onChangeText={setDescarteGeneralCanastillas}
          />
          <TextInput
            style={styles.inputs}
            placeholder="Kilos"
            inputMode="numeric"
            value={descarteGeneralKilos}
            onChangeText={setDescarteGeneralKilos}

          />

          <Text style={{ marginTop: 5, fontSize: 15, fontWeight: 'bold' }}>
            Pareja
          </Text>
          <TextInput
            style={styles.inputs}
            placeholder="N. de canastillas"
            inputMode="numeric"
            value={parejaCanastillas}
            onChangeText={setParejaCanastillas}
          />
          <TextInput
            style={styles.inputs}
            placeholder="Kilos"
            inputMode="numeric"
            value={parejaKilos}
            onChangeText={setParejaKilos}
          />

          <Text style={{ marginTop: 5, fontSize: 15, fontWeight: 'bold' }}>
            Balin
          </Text>
          <TextInput
            style={styles.inputs}
            placeholder="N. de canastillas"
            inputMode="numeric"
            value={balinCanastillas}
            onChangeText={setBalinCanastillas}
          />
          <TextInput
            style={styles.inputs}
            placeholder="Kilos"
            inputMode="numeric"
            value={balinKilos}
            onChangeText={setBalinKilos}
          />

          <Text style={{ marginTop: 5, fontSize: 15, fontWeight: 'bold' }}>
            Descompuesta
          </Text>
          <TextInput
            style={styles.inputs}
            placeholder="N. de canastillas"
            inputMode="numeric"
            value={descompuestaCanastillas}
            onChangeText={setDescompuestaCanastillas}
          />
          <TextInput
            style={styles.inputs}
            placeholder="Kilos"
            inputMode="numeric"
            value={descompuestaKilos}
            onChangeText={setDescompuestaKilos}
          />

          <Text style={{ marginTop: 5, fontSize: 15, fontWeight: 'bold' }}>
            Desprendimiento de piel
          </Text>
          <TextInput
            style={styles.inputs}
            placeholder="N. de canastillas"
            inputMode="numeric"
            value={pielCanastillas}
            onChangeText={setPielCanastillas}
          />
          <TextInput
            style={styles.inputs}
            placeholder="Kilos"
            inputMode="numeric"
            value={pielKilos}
            onChangeText={setPielKilos}
          />

          <Text style={{ marginTop: 5, fontSize: 15, fontWeight: 'bold' }}>
            Hojas
          </Text>
          <TextInput
            style={styles.inputs}
            placeholder="N. de canastillas"
            inputMode="numeric"
            value={hojasCanastillas}
            onChangeText={setHojasCanastillas}
          />
          <TextInput
            style={styles.inputs}
            placeholder="Kilos"
            inputMode="numeric"
            value={hojaskilos}
            onChangeText={setHojaskilos}
          />

          <View style={styles.viewBotones}>
            <Button title="Guardar" onPress={guardarDatos} color="#49659E" />
          </View>
        </View>
      ) : (
        <ActivityIndicator size="large" color="#00ff00" style={styles.loader} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',

    backgroundColor: '#EEFBE5',
    paddingTop: 10,
    paddingBottom: 50,
  },
  inputs: {
    borderWidth: 2,
    borderColor: 'skyblue',
    width: 250,
    paddingTop: 5,
    margin: 10,
    borderRadius: 10,
    paddingLeft: 8,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  viewBotones: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  loader: {
    marginTop: 250,
  },
});
