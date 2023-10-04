import { createContext, ReactNode, useEffect, useState } from "react";
import { Times } from "@/lib/model";
import {
  ICity,
  ICountry,
  IRegion,
  IRelease,
  TimeFormat,
  TimeNames,
  TypeTimer,
} from "@/lib/types";
import { useRouter } from "next/router";
import { DateTime } from "luxon";
import useInterval from "@/lib/use-interval";
import { API_DATE_FORMAT, LOCAL_KEYS } from "@/lib/const";
import setLanguage from "next-translate/setLanguage";
import i18n from "@/i18n.json";
import { useTheme } from "next-themes";
import { metadata } from "@/lib/meta";
const color = {
  [TimeNames.Imsak]: "sky",
  [TimeNames.Gunes]: "orange",
  [TimeNames.Ogle]: "amber",
  [TimeNames.Ikindi]: "rose",
  [TimeNames.Aksam]: "blue",
  [TimeNames.Yatsi]: "indigo",
};

interface ICommonStore {
  appLoading: boolean;
  themeColor: string;
  _settings: {
    country: undefined | ICountry;
    region: undefined | IRegion;
    city: undefined | ICity;
    timeFormat: TimeFormat;
    adjustments: number[];
    ramadanTimer: boolean;
  };
  _setSettings: (value: ICommonStore["_settings"]) => void;
  settings: {
    country: undefined | ICountry;
    region: undefined | IRegion;
    city: undefined | ICity;
    timeFormat: TimeFormat;
    adjustments: number[];
    ramadanTimer: boolean;
  };
  setSettings: (value: ICommonStore["_settings"]) => void;
  fetchData: (cityId: string) => Promise<void>;
  times: undefined | Times;
  rawTimes: undefined | Times;
  timer: TypeTimer;
  timerRamadan: TypeTimer;
  releases: IRelease[];
}

export const CommonStoreContext = createContext<ICommonStore>({
  appLoading: false,
  themeColor: "#777",
  _settings: {
    country: undefined,
    region: undefined,
    city: undefined,
    timeFormat: TimeFormat.TwentyFour,
    adjustments: [0, 0, 0, 0, 0, 0],
    ramadanTimer: false,
  },
  _setSettings: () => {},
  settings: {
    country: undefined,
    region: undefined,
    city: undefined,
    timeFormat: TimeFormat.TwentyFour,
    adjustments: [0, 0, 0, 0, 0, 0],
    ramadanTimer: false,
  },
  setSettings: () => {},
  fetchData: () => Promise.resolve(),
  rawTimes: undefined,
  times: undefined,
  timer: [0, 0, 0],
  timerRamadan: [0, 0, 0],
  releases: [],
});

export function CommonStoreProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  const [appLoading, setAppLoading] =
    useState<ICommonStore["appLoading"]>(false);

  const [settings, setSettings] = useState<ICommonStore["settings"]>({
    country: undefined,
    region: undefined,
    city: undefined,
    timeFormat: TimeFormat.TwentyFour,
    adjustments: [0, 0, 0, 0, 0, 0],
    ramadanTimer: false,
  });
  const [_settings, _setSettings] = useState<ICommonStore["settings"]>({
    country: undefined,
    region: undefined,
    city: undefined,
    timeFormat: TimeFormat.TwentyFour,
    adjustments: [0, 0, 0, 0, 0, 0],
    ramadanTimer: false,
  });

  const [releases, setReleases] = useState<ICommonStore["releases"]>([]);

  const [times, setTimes] = useState<ICommonStore["times"]>();
  const [rawTimes, setRawTimes] = useState<ICommonStore["rawTimes"]>();
  const [timer, setTimer] = useState<TypeTimer>([0, 0, 0]);
  const [timerRamadan, setTimerRamadan] = useState<TypeTimer>([0, 0, 0]);

  const now = times?.time?.now ?? TimeNames.Imsak;
  const themeColor = color[now];

  const fetchReleases = async () => {
    const res = await fetch("/api/releases");
    const data = await res.json();
    setReleases(data);
  };

  const fetchData = async (cityID: string) => {
    if (!cityID) {
      console.error("cityID is required");
      return;
    }

    try {
      setAppLoading(true);
      const url = `/api/times?cityID=${cityID}`;
      const res = await fetch(url);
      const data = await res.json();

      const lastDate = DateTime.fromFormat(
        data[data.length - 1].MiladiTarihKisa,
        API_DATE_FORMAT
      );
      const updateDate = lastDate.minus({ days: 2 }).toUnixInteger() * 1000;

      localStorage.setItem(LOCAL_KEYS.UpdateDate, `${updateDate}`);
      localStorage.setItem(LOCAL_KEYS.Data, JSON.stringify(data));

      setTimes(new Times(data, settings.adjustments));
      setRawTimes(new Times(data));
    } catch (e) {
      console.error(e);
    } finally {
      setAppLoading(false);
    }
  };

  const initApp = async () => {
    const local = localStorage.getItem(LOCAL_KEYS.Lang) || i18n.defaultLocale;
    await setLanguage(local);

    const settings = localStorage.getItem(LOCAL_KEYS.Settings);
    const data = localStorage.getItem(LOCAL_KEYS.Data);
    const updateDate = localStorage.getItem(LOCAL_KEYS.UpdateDate) ?? 0;

    if (settings && data) {
      const parsedSettings = JSON.parse(settings);
      setSettings(parsedSettings);

      if (+updateDate <= Date.now()) {
        console.log("The prayer data is old, fetching new data...");
        await fetchData(parsedSettings.city?.IlceID);
      } else {
        setTimes(new Times(JSON.parse(data), parsedSettings.adjustments));
        setRawTimes(new Times(JSON.parse(data)));
      }

      await fetchReleases();
    } else {
      await router.push("/settings/country");
    }
  };

  const updateTimer = () => {
    if (!times) return;
    setTimer(times?.timer() as TypeTimer);
    setTimerRamadan(times?.timerRamadan() as TypeTimer);
  };

  useEffect(() => {
    initApp();
  }, []);

  useEffect(() => {
    if (settings.country && settings.region && settings.city) {
      localStorage.setItem(LOCAL_KEYS.Settings, JSON.stringify(settings));
    }
  }, [settings]);

  useEffect(() => {
    if (!times) return;
    updateTimer();
  }, [times]);

  useEffect(() => {
    const handleVisibilityChange = () => {
    //  if (document.hidden) {
        document.title =  document.title = document.getElementById("summaryTimer")?.textContent?.replace("vaktine","") as string;
    //  } else {
    //    document.title = metadata.title;
    //  }
    };
    handleVisibilityChange();
  });
  
  useInterval(
    () => {
      let localTime = DateTime.local();

      const timeTravel = times?.timeTravel ?? [0, 0, 0];
      const hasChange = timeTravel.some(value => value !== 0);

      if (hasChange) {
        localTime = localTime.set({
          hour: localTime.hour + timeTravel[0],
          minute: localTime.minute + timeTravel[1],
          second: localTime.second + timeTravel[2],
        });
      }

      times?.updateDateTime(localTime);
      updateTimer();
    },
    times ? 1000 : null
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <CommonStoreContext.Provider
      value={{
        appLoading,
        themeColor,
        _settings,
        _setSettings,
        settings,
        setSettings,
        fetchData,
        rawTimes,
        times,
        timer,
        timerRamadan,
        releases,
      }}
    >
      {children}
    </CommonStoreContext.Provider>
  );
}
