const fetch = require("node-fetch");
var xml2js = require("xml2js");
var fs = require("fs");
var csvWriter = require("csv-write-stream");
var schedule = require("node-schedule");

const getTrafficDensityStatus = async () => {
  const response = await fetch(
    "https://data.vd-nap.dk/secure/api/v1/nap/data?profile=VD.TrafficDensity.Status.TravelTimes&auth=eyJhbGciOiJSUzUxMiJ9.eyJjdXMiOiJuYXAiLCJzdWIiOiI2MTAiLCJkb20iOiJ1c2VycyIsImNyZWF0ZWQiOjE2MTI4NTg3ODUwNzksInByb2ZpbGUiOiJWRC5UcmFmZmljRGVuc2l0eS5TdGF0dXMuVHJhdmVsVGltZXMiLCJzdWJzY3JpcHRpb25JZCI6Ijk0NDg1NyIsImV4cCI6MTkyODIxODc4NSwicm9sIjpbIlZETkFQX0FQSUFDQ0VTUyJdLCJ0aWQiOiIzODEifQ.YVPJL2R9cwxIal5DPnmyxzPkVfOSlUwVUFB1Q0Wqp3LMKKrf0-z8NrEbA2jw_T5z4sO5VRuq_B65BBLXK53KwnOPJGqFdnWLOoQlLAjx9k1kBZI_A8xg5Zj9GzJ7SnymPCC3r90tj0p0hxij7CWGNPcTX7Mp7ZhrddY-Og39iSDetkaBmAbagJEJBrrmTw0pAyv3kzxm9ttUG-AakMmmSo4md1LDRPq0m9VBfX9SX3zuwGk6mPmcu_eHfIh55Le2LyF10laWOyvxt6AknI8B55uAFxAG5q8yLUTydQqU3ssPdOcThcEtkkamVMxoSpD5g_S0FYkkxyeUobRtcUcwLQ"
  );
  const xmlResponse = await response.text();
  const parsedXml = await xml2js.parseStringPromise(xmlResponse);

  return parsedXml;
};

const formatData = async (data) => {
  const formatted = data.d2LogicalModel.payloadPublication[0].elaboratedData.map(
    ({ basicData }) => {
      const [dataRoot] = basicData;
      return {
        time: dataRoot.measurementOrCalculationTime[0],
        locationId:
          dataRoot.pertinentLocation[0].predefinedLocationReference[0].$.id,
        trafficStatusValue: dataRoot.trafficStatus[0].trafficStatusValue[0],
        travelTime: Number(
          dataRoot.trafficStatusExtension[0].travelTime[0].duration[0]
        ),
        normallyExpectedTravelTime: Number(
          dataRoot.trafficStatusExtension[0].normallyExpectedTravelTime[0]
            .duration[0]
        ),
        freeFlowSpeed: Number(
          dataRoot.trafficStatusExtension[0].freeFlowSpeed[0].speed[0]
        ),
        normallyExpectedSpeed: Number(
          dataRoot.trafficStatusExtension[0].normallyExpectedSpeed[0].speed[0]
        ),
        avarageVehicleSpeed: Number(
          dataRoot.trafficStatusExtension[0].avarageVehicleSpeed[0].speed[0]
        ),
      };
    }
  );

  return formatted;
};

const writeToCsv = async (data) => {
  let writer = csvWriter();
  const file = "out.csv";
  writer = csvWriter({ sendHeaders: false });

  if (!fs.existsSync(file)) {
    writer = csvWriter({
      headers: [
        "time",
        "locationId",
        "trafficStatusValue",
        "travelTime",
        "normallyExpectedTravelTime",
        "freeFlowSpeed",
        "normallyExpectedSpeed",
        "avarageVehicleSpeed",
      ],
    });
  }

  writer.pipe(fs.createWriteStream(file, { flags: "a" }));

  data.forEach((item) => {
    writer.write(item);
  });

  writer.end();
};

const getVdDataAdWriteToCsv = async () => {
  const trafficData = await getTrafficDensityStatus();
  const formattedTrafficData = await formatData(trafficData);
  writeToCsv(formattedTrafficData);
  console.log("Done");
};

schedule.scheduleJob("15 * * * *", function () {
  getVdDataAdWriteToCsv();
  console.log("Done");
});
