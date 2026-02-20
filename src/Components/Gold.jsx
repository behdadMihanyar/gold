/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from "react";
import { FaLongArrowAltUp } from "react-icons/fa";
import abshode from "../img/abshode.png";
import emami from "../img/emami.png";
import ons from "../img/ons.png";
import tala24 from "../img/tala24.png";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

const Gold = () => {
  const [filterCoin, setFilterCoin] = useState([]);
  const [id, setId] = useState(0);
  useEffect(() => {
    let newArray = {};
    try {
      const getData = async () => {
        const req = await fetch(
          "https://brsapi.ir/Api/Market/Gold_Currency.php?key=FreeOmyTOvQelQcZdcQwNrggWfbKJKTu",
        );
        const res = await req.json();
        newArray = res.gold.reverse().map((item, index) => ({
          ...item,
          id: index,
        }));
        setFilterCoin(newArray);
      };
      getData();
    } catch (error) {
      console.log("error fetching data", error.message);
    }
  }, []);
  const newItems = filterCoin.filter(
    (item) => item.id === 1 || item.id === 6 || item.id === 7,
  );
  const persianDate = new DateObject({
    calendar: persian,
    locale: persian_fa,
  });
  const getToday = persianDate.format("YYYY/MM/DD");

  return (
    <div>
      <h1 className="text-center font-bold text-2xl bg-gray-200 p-3 rounded-2xl shadow-md">
        {getToday}
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 mb-3">
        {newItems.map((para) => (
          <div
            key={para.name}
            className="flex flex-row justify-between border border-white p-4 rounded-lg shadow-md transition-all duration-300 ease-in-out text-white hover:scale-105"
          >
            <div>
              <div className=" flex gap-3 flex-col">
                <h2 className="text-xl font-semibold text-black">
                  {para.name}
                </h2>
                <div className="flex flex-col">
                  <p className="text-lg flex flex-row content-center text-green-500 font-bold">
                    {para.price.toLocaleString()} فروش
                  </p>
                  <p className="text-lg flex flex-row content-center text-red-500 font-bold">
                    {para.id === 1
                      ? (para.price - 5000000).toLocaleString()
                      : para.id === 6
                        ? (para.price - 250000).toLocaleString()
                        : (para.price - 60000).toLocaleString()}
                    خرید
                  </p>
                </div>
                <p className="text-sm text-black">
                  {para.time} {para.date}
                </p>
              </div>
            </div>
            <div>
              <div className="w-25 h-25 flex items-center justify-center">
                {para.id === 0 ? (
                  <img src="../img/bahar.png" className="w-25 h-25" />
                ) : para.id === 1 ? (
                  <img src={emami} className="w-18 h-18" />
                ) : para.id === 2 ? (
                  <img src="../img/nim.png" />
                ) : para.id === 3 ? (
                  <img src="../img/rob.png" />
                ) : para.id === 4 ? (
                  <img src="../img/1g.png" />
                ) : para.id === 5 ? (
                  <img src={ons} />
                ) : para.id === 6 ? (
                  <img src={abshode} />
                ) : para.id === 7 ? (
                  <img src={tala24} />
                ) : para.id === 8 ? (
                  <img src="../img/18.png" />
                ) : (
                  <img src="../img/24.png" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Gold;
