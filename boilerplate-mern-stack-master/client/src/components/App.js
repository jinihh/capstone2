import React, { Suspense } from 'react';
import { Route, Switch } from "react-router-dom";
import Auth from "../hoc/auth";
// pages for this product
import LandingPage from "./views/LandingPage/LandingPage.js";
import LoginPage from "./views/LoginPage/LoginPage.js";
import RegisterPage from "./views/RegisterPage/RegisterPage.js";
import NavBar from "./views/NavBar/NavBar";
import Footer from "./views/Footer/Footer"
import UploadVideoPage from "./views/UploadVideoPage/UploadVideoPage"
import DetailVideoPage from "./views/DetailVideoPage/DetailVideoPage"
import ResultPage from "./views/ResultPage/ResultPage"

//null   Anyone Can go inside
//true   only logged in user can go inside
//false  logged in user can't go inside
//<Route exact path="/video/:videoId" component={Auth(DetailVideoPage, null)} />
//독립적인 비디오 id를 통해 들어오게


function App() {
  return (
    <Suspense fallback={(<div>Loading...</div>)}>
      <NavBar />
      <div style={{ paddingTop: '69px', minHeight: 'calc(100vh - 80px)' }}>
        <Switch>
          <Route exact path="/" component={Auth(LandingPage, null)} />
          <Route exact path="/login" component={Auth(LoginPage, false)} />
          <Route exact path="/register" component={Auth(RegisterPage, false)} />
          <Route exact path="/video/upload" component={Auth(UploadVideoPage, true)} />
          <Route exact path="/video/:videoId" component={Auth(DetailVideoPage, true)} />
          <Route exact path="/video/result:videoId" component={Auth(ResultPage, true)} />
          <Route exact path="/video/detected/:videoId" component={Auth(DetailVideoPage, true)} />
          

        </Switch>
      </div>
      <Footer />
    </Suspense>
  );
}

export default App;
