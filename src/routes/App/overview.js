import React, { PureComponent, Fragment } from "react";
import PropTypes from "prop-types";
import moment from "moment";
import { connect } from "dva";
import {
  ChartCard,
  yuan,
  MiniArea,
  MiniBar,
  MiniProgress,
  Field,
  Bar,
  Pie,
  TimelineChart,
} from "../../components/Charts";
import numeral from "numeral";
import { Link, Switch, Route } from "dva/router";
import {
  Row,
  Col,
  Card,
  Form,
  Button,
  Icon,
  Menu,
  Dropdown,
  Tooltip,
} from "antd";
import PageHeaderLayout from "../../layouts/PageHeaderLayout";
import { getRoutes } from "../../utils/utils";
import appAcionLogUtil from "../../utils/app-action-log-util";
import dateUtil from "../../utils/date-util";
import { getRouterData } from "../../common/router";
import { getActionLog, getActionLogDetail } from "../../services/app";
import LogSocket from "../../utils/logSocket";

import StatusIcon from "../../components/StatusIcon";

import LogProcress from "../../components/LogProcress";
import styles from "./Index.less";
import globalUtil from "../../utils/global";
import appUtil from "../../utils/app";
import userUtil from "../../utils/user";
import teamUtil from "../../utils/team";
import regionUtil from "../../utils/region";
import monitorDataUtil from "../../utils/monitorDataUtil";
import AppVersionManage from "../../components/AppVersionManage";

const ButtonGroup = Button.Group;

@connect(({ user, appControl }) => ({ currUser: user.currentUser, appDetail: appControl.appDetail }))
class LogItem extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      status: "",
      resultStatus: "",
      opened: false,
      logType: "info",
      logs: [],
      actioning: false,
    };
  }
  static contextTypes = {
    isActionIng: PropTypes.func,
    appRolback: PropTypes.func,
  }
  showLogType = () => {
    if (this.state.status === "ing") {
      return "none";
    }

    if (this.state.opened === false) {
      return "none";
    }
    return "";
  }
  componentDidMount() {
    const { data } = this.props;
    if (data) {
      if (this.ref) {
        this.ref.querySelector(".actioncn").innerHTML = (appAcionLogUtil.getActionCN(data));
        if (appAcionLogUtil.isSuccess(data)) {
          this.onSuccess();
        }
        if (appAcionLogUtil.isFail(data)) {
          this.onFail(data);
        }
        if (appAcionLogUtil.isTimeout(data)) {
          this.onTimeout(data);
        }
        if (appAcionLogUtil.isActioning(data)) {
          this.setState({ status: "ing", actioning: true });
          this.ref.querySelector(".actionresultcn").innerHTML = "进行中";
          this.context.isActionIng(true);
        }
        this.ref.querySelector(".action-user").innerHTML = "@" + appAcionLogUtil.getActionUser(data);
      }
    }
  }
  loadLog() {
    getActionLogDetail({
      app_alias: this.props.appAlias,
      level: this.state.logType,
      team_name: globalUtil.getCurrTeamName(),
      event_id: this.props.data.event_id,
    }).then((data) => {
      if (data) {
        console.log("data",data)
        this.setState({
          // logs: (data.list || []).reverse(),
          logs: (data.list || []),
        });
      }
    });
  }
  getSocketUrl = () => {
    let currTeam = userUtil.getTeamByTeamName(this.props.currUser, globalUtil.getCurrTeamName());
    let currRegionName = globalUtil.getCurrRegionName();

    if (currTeam) {
      let region = teamUtil.getRegionByName(currTeam, currRegionName);

      if (region) {
        return regionUtil.getEventWebSocketUrl(region);
      }
    }
    return "";
  }
  createSocket() {
    const { socketUrl, data } = this.props;
    let slef = this;
    this.socket = new LogSocket({
      url: this.getSocketUrl(),
      eventId: data.event_id,
      onMessage: (data) => {
        let logs = this.state.logs;
        logs.unshift(data);
        this.setState({
          logs: [].concat(logs),
        });
      },
    });
  }
  onClose = () => {
    this.isDoing = false;
  }
  onSuccess = (data) => {
    this.setState({ resultStatus: "success" });
    this
      .ref
      .querySelector(".actionresultcn")
      .innerHTML = "完成";
  }
  onTimeout = (data) => {
    this.setState({ resultStatus: "timeout" });
    this
      .ref
      .querySelector(".actionresultcn")
      .innerHTML = "超时";

    this
      .ref
      .querySelector(".action-error-msg")
      .innerHTML = "(" + appAcionLogUtil.getFailMessage(data) + ")";
  }
  onFail = (data) => {
    this.setState({ resultStatus: "fail" });
    this
      .ref
      .querySelector(".actionresultcn")
      .innerHTML = "失败";

    this
      .ref
      .querySelector(".action-error-msg")
      .innerHTML = "(" + appAcionLogUtil.getFailMessage(data) + ")";
  }
  onComplete = (data) => {
    this.setState({ status: "" });
    this
      .context
      .isActionIng(false);
    this.close();
  }
  getLogContHeight() {
    const { status, opened } = this.state;
    if (status === "ing" && !opened) {
      return 16;
    }

    if (opened) {
      return "auto";
    }

    return 0;
  }
  open = () => {
    this.setState({
      opened: true,
      logType: "info",
    }, () => {
      this.loadLog();
    });
  }
  close = () => {
    this.setState({ opened: false });
  }
  changeLogType = (type) => {
    if (type === this.state.logType) { return; }
    this.setState({
      logType: type,
    }, () => {
      this.loadLog();
    });
  }
  saveRef = (ref) => {
    this.ref = ref;
  }
  getResultClass() {
    const { data } = this.props;
    if (this.state.resultStatus === "fail") {
      return styles.fail;
    }

    if (this.state.resultStatus === "success") {
      return styles.success;
    }
    return "";
  }
  handleRollback = () => {
    this
      .context
      .appRolback(appAcionLogUtil.getRollbackVersion(this.props.data));
  }
  render() {
    const { status, opened, logType, logs } = this.state;
    const { data } = this.props;
    console.log("logs",logs)
    if (!data) {
      return null;
    }
    return (
      <div
        ref={this.saveRef}
        className={`${styles.logItem} ${this.getResultClass()}`}
      >
        <div className={styles.logItemDate}>
          <span className={styles.time}>{appAcionLogUtil.getActionTime(data)}</span>
          <span className={styles.date}>{dateUtil.dateToCN(appAcionLogUtil.getActionDateTime(data), "yyyy-MM-dd")}</span>
        </div>
        <div className={styles.logItemMain}>
          <div className={styles.hd}>
            <label className={styles.tit}>
              <span className="actioncn" />
              <span className="actionresultcn" />
              <span className="action-error-msg" />
              <span className="action-user" />
            </label>
            <div className={styles.btns}>
              {appAcionLogUtil.canRollback(data) && appUtil.canRollback(this.props.appDetail)
                ? <span onClick={this.handleRollback} className={styles.btn}>回滚到此版本</span>
                : ""
              }
              {!opened
                ? <span onClick={this.open} className={styles.btn}>查看详情</span>
                : <span onClick={this.close} className={styles.btn}>收起</span>}
            </div>
          </div>
          {appAcionLogUtil.isShowCommitInfo(data)
            ? <div className={styles.codeVersion}>
              <div className={styles.versionInfo}>代码信息： {appAcionLogUtil.getCommitLog(data)}</div>
              <div className={styles.versionAuthor}>#{appAcionLogUtil.getCodeVersion(data)}
                by {appAcionLogUtil.getCommitUser(data)}
              </div>
            </div>
            : ""
          }

          <ButtonGroup
            style={{
              display: this.showLogType(),
            }}
            size="small"
            className={styles.logTypeBtn}
          >
            <Button
              onClick={() => {
                this.changeLogType("info");
              }}
              className={logType === "info"
                ? "active"
                : ""}
              type="dashed"
            >Info日志
            </Button>
            <Button
              onClick={() => {
                this.changeLogType("debug");
              }}
              className={logType === "debug"
                ? "active"
                : ""}
              type="dashed"
            >Debug日志
            </Button>
            <Button
              onClick={() => {
                this.changeLogType("error");
              }}
              className={logType === "error"
                ? "active"
                : ""}
              type="dashed"
            >Error日志
            </Button>
          </ButtonGroup>
          <div
            style={{
              height: this.getLogContHeight(),
              maxHeight: 500,
              overflowY: "auto",
            }}
            className={`${styles.logContent} logs-cont`}
          >
          {/* 动态日志 */}
            {status === "ing" && <LogProcress
              resover
              onClose={this.onClose}
              onComplete={this.onComplete}
              onSuccess={this.onSuccess}
              onTimeout={this.onTimeout}
              onFail={this.onFail}
              socketUrl={this.getSocketUrl()}
              eventId={data.event_id}
            />}
            {(logs || []).map((item) => <p key={item.message}>
              <span style={{
                marginRight: 10
              }}>{dateUtil.format(item.time, 'hh:mm:ss')}</span>
              <span>{item.message}</span>
            </p>)
            }
          </div>
        </div>
      </div>
    );
  }
}

class LogList extends PureComponent {
  render() {
    const list = this.props.list;
    return (
      <div className={styles.logs}>
        {list.map((item) => (<LogItem appDetail={this.props.appDetail} key={item.event_id} appAlias={this.props.appAlias} data={item} />))
        }
      </div>
    );
  }
}

@connect(({ user, appControl }) => ({
  currUser: user.currentUser,
  appRequest: appControl.appRequest,
  appRequestRange: appControl.appRequestRange,
  requestTime: appControl.requestTime,
  requestTimeRange: appControl.requestTimeRange,
  appDisk: appControl.appDisk,
  appMemory: appControl.appMemory,
}), null, null, { withRef: true })
export default class Index extends PureComponent {
  constructor(arg) {
    super(arg);
    this.state = {
      actionIng: false,
      logList: [],
      page: 1,
      page_size: 6,
      hasNext: false,
      // 安装的性能分析插件
      anaPlugins: [],
      disk: 0,
      memory: 0,
      showVersionManage: false,
    };
    this.inerval = 5000;
  }
  static contextTypes = {
    isActionIng: PropTypes.func,
    appRolback: PropTypes.func,
  }
  componentDidMount() {
    const { dispatch, appAlias } = this.props;
    this.loadLog();
    this.mounted = true;
    this.getAnalyzePlugins();
    this.fetchAppDiskAndMemory();
  }
  componentWillUnmount() {
    this.mounted = false;
    this
      .props
      .dispatch({ type: "appControl/clearDisk" });
    this
      .props
      .dispatch({ type: "appControl/clearMemory" });
    this
      .props
      .dispatch({ type: "appControl/clearRequestTime" });
    this
      .props
      .dispatch({ type: "appControl/clearRequestTimeRange" });
    this
      .props
      .dispatch({ type: "appControl/clearRequest" });
    this
      .props
      .dispatch({ type: "appControl/clearRequestRange" });
  }
  getAnalyzePlugins() {
    this
      .props
      .dispatch({
        type: "appControl/getAnalyzePlugins",
        payload: {
          team_name: globalUtil.getCurrTeamName(),
          app_alias: this.props.appAlias,
        },
        callback: (data) => {
          const list = data.list || [];
          if (list.length) {
            this.setState({ anaPlugins: list });
            this.fetchRequestTime();
            this.fetchRequestTimeRange();
            this.fetchRequest();
            this.fetchRequestRange();
          }
        },
      });
  }
  fetchAppDiskAndMemory() {
    this
      .props
      .dispatch({
        type: "appControl/getAppResource",
        payload: {
          team_name: globalUtil.getCurrTeamName(),
          app_alias: this.props.appAlias,
        },
        callback: (data) => {
          if (data && data.bean) {
            this.setState({ disk: data.bean.disk || 0, memory: data.bean.memory || 0 });
          }
        },
      });
  }
  fetchRequestTime() {
    if (!this.mounted) { return; }
    this
      .props
      .dispatch({
        type: "appControl/fetchRequestTime",
        payload: {
          team_name: globalUtil.getCurrTeamName(),
          app_alias: this.props.appAlias,
          serviceId: this.props.appDetail.service.service_id,
        },
        complete: () => {
          if (this.mounted) {
            setTimeout(() => {
              this.fetchRequestTime();
            }, this.inerval);
          }
        },
      });
  }
  fetchRequestTimeRange() {
    if (!this.mounted) { return; }
    this
      .props
      .dispatch({
        type: "appControl/fetchRequestTimeRange",
        payload: {
          team_name: globalUtil.getCurrTeamName(),
          app_alias: this.props.appAlias,
          start: this.getStartTime(),
          serviceId: this.props.appDetail.service.service_id,
          step: this.getStep(),
        },
        complete: () => {
          if (this.mounted) {
            setTimeout(() => {
              this.fetchRequestTimeRange();
            }, this.inerval);
          }
        },
      });
  }
  fetchRequest() {
    if (!this.mounted) { return; }
    this
      .props
      .dispatch({
        type: "appControl/fetchRequest",
        payload: {
          team_name: globalUtil.getCurrTeamName(),
          app_alias: this.props.appAlias,
          serviceId: this.props.appDetail.service.service_id,
        },
        complete: () => {
          if (this.mounted) {
            setTimeout(() => {
              this.fetchRequest();
            }, this.inerval);
          }
        },
      });
  }
  fetchRequestRange() {
    if (!this.mounted) { return; }
    this
      .props
      .dispatch({
        type: "appControl/fetchRequestRange",
        payload: {
          team_name: globalUtil.getCurrTeamName(),
          app_alias: this.props.appAlias,
          start: this.getStartTime(),
          serviceId: this.props.appDetail.service.service_id,
          step: this.getStep(),
        },
        complete: () => {
          if (this.mounted) {
            setTimeout(() => {
              this.fetchRequestRange();
            }, this.inerval);
          }
        },
      });
  }

  loadLog = (append) => {
    const { dispatch, appAlias } = this.props;
    getActionLog({
      app_alias: appAlias,
      page: this.state.page,
      page_size: this.state.page_size,
      start_time: "",
      team_name: globalUtil.getCurrTeamName(),
    }).then((data) => {
      if (data) {
        if (!append) {
          this.setState({
            hasNext: data.has_next,
            logList: (data.list || []),
          });
        } else {
          this.setState({
            hasNext: data.has_next,
            logList: (this.state.logList).concat(data.list || []),
          });
        }
      }
    });
  }
  onAction = (actionLog) => {
    this.setState({
      logList: [actionLog].concat(this.state.logList),
    });
  }
  handleNextPage = () => {
    this.setState({
      page: this.state.page + 1,
    }, () => {
      this.loadLog(true);
    });
  }
  getStartTime() {
    return (new Date().getTime() / 1000) - (60 * 60);
  }
  getStep() {
    return 60;
  }
  showVersionManage = () => {
    this.setState({ showVersionManage: true });
  }
  hideVersionManage = () => {
    this.setState({ showVersionManage: false });
  }
  handleRollback = (version) => {
    this
      .context
      .appRolback(version);
  }
  render() {
    const topColResponsiveProps = {
      xs: 24,
      sm: 12,
      md: 12,
      lg: 12,
      xl: 6,
      style: {
        marginBottom: 24,
      },
    };
    const { logList, hasNext, anaPlugins } = this.state;
    const { appDetail } = this.props;
    const status = this.props.status || {};
    let hasAnaPlugins = !!anaPlugins.length;
    return (
      <Fragment>
        <Row gutter={24}>
          <Col {...topColResponsiveProps}>
            <ChartCard
              bordered={false}
              title="应用状态"
              footer={<span className={
                styles.statuscn
              } > {
                  status.status_cn || "-"
                }
              </span>}
            >
              <div className={styles.charContent}>
                <div className={styles.statusIconWraper}>
                  <StatusIcon status={status.status} />
                </div>

              </div>
            </ChartCard>
          </Col>

          <Col {...topColResponsiveProps}>
            {hasAnaPlugins
              ? <ChartCard
                bordered={false}
                title="平均响应时间（ms）"
                action={<Tooltip title="平均响应时间，单位毫秒" > <Icon type="info-circle-o" /> </Tooltip>}
                total={numeral(monitorDataUtil.queryTog2(this.props.requestTime)).format("0,0")}
                footer={<Field label="最大响应时间" value="-" />}
                contentHeight={46}
              >
                <MiniArea
                  color="#975FE4"
                  data={monitorDataUtil.queryRangeTog2(this.props.requestTimeRange)}
                />
              </ChartCard>
              : <ChartCard
                bordered={false}
                title="平均响应时间（ms）"
                action={<Tooltip title="平均响应时间，单位毫秒" > <Icon type="info-circle-o" /> </Tooltip>}
                footer={<Field label="&nbsp;" value="" />}
                contentHeight={88}
              >
                <div
                  style={{
                    textAlign: "center",
                    position: "relative",
                    top: -10,
                  }}
                >
                  <p>暂无开通性能分析插件</p>
                  <Link to={`/team/${globalUtil.getCurrTeamName()}/region/${globalUtil.getCurrRegionName()}/app/${this.props.appAlias}/plugin`}>去开通</Link>
                </div>
              </ChartCard>
            }

          </Col>
          <Col {...topColResponsiveProps}>

            {hasAnaPlugins
              ? <ChartCard
                bordered={false}
                title="吞吐率（dps）"
                action={<Tooltip title="过去一分钟平均每5s的请求次数" > <Icon type="info-circle-o" /> </Tooltip>}
                total={numeral(monitorDataUtil.queryTog2(this.props.appRequest)).format("0,0")}
                footer={<Field label="最大吞吐率" value="-" />}
                contentHeight={46}
              >
                <MiniArea
                  color="#4593fc"
                  data={monitorDataUtil.queryRangeTog2(this.props.appRequestRange)}
                />
              </ChartCard>
              : <ChartCard
                bordered={false}
                title="吞吐率（dps）"
                action={<Tooltip title="过去一分钟平均每5s的请求次数" > <Icon type="info-circle-o" /> </Tooltip>}
                footer={<Field label="&nbsp;" value="" />}
                contentHeight={88}
              >
                <div
                  style={{
                    textAlign: "center",
                    position: "relative",
                    top: -10,
                  }}
                >
                  <p>暂无开通性能分析插件</p>
                  <Link to={`/team/${globalUtil.getCurrTeamName()}/region/${globalUtil.getCurrRegionName()}/app/${this.props.appAlias}/plugin`}>去开通</Link>
                </div>
              </ChartCard>
            }

          </Col>
          <Col {...topColResponsiveProps}>
            <ChartCard
              bordered={false}
              title="资源使用"
              action={null}
              footer={<Field label="" value="" />}
            >
              <div className={styles.charContent}>
                <p className={styles.charContentTit}>
                  {numeral(this.state.memory).format("0,0")}
                  <span className={styles.sub}>MB 内存</span>
                </p>

                <p className={styles.charContentTit}>
                  {numeral(this.state.disk).format("0,0")}
                  <span className={styles.sub}>MB 磁盘</span>
                </p>

              </div>
            </ChartCard>
          </Col>
        </Row>
        <Row gutter={24}>
          <Col xs={24} xm={24} md={24} lg={24} xl={24}>
            <Card bordered={false} title="操作日志" extra={<a onClick={this.showVersionManage} href="javascript:;">构建版本管理</a>}>
              <LogList appDetail={this.props.appDetail} appAlias={this.props.appAlias} list={logList || []} /> {this.state.hasNext && <p
                style={{
                  textAlign: "center",
                  fontSize: 30,
                }}
              ><Icon
                  style={{
                    cursor: "pointer",
                  }}
                  onClick={this.handleNextPage}
                  type="down"
                />
              </p>
              }

              {this.state.showVersionManage && <AppVersionManage onRollback={this.handleRollback} onCancel={this.hideVersionManage} team_name={globalUtil.getCurrTeamName()} service_alias={this.props.appAlias} />}
            </Card>
          </Col>

        </Row>
      </Fragment>
    );
  }
}
