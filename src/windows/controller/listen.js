const Api = require('../../common/api');
const Const = require('../../common/const');
const Logger = require('../../common/logger');
const Store = require('../../common/store');
const Tools = require('../../common/tools');
const { PageEvent } = require('../../common/event');

class Listen {
  constructor() {
    this.logger = null;

    this.init();
  }

  init() {
    this.logger = new Logger('Listen');
  }

  // 自动刷歌
  async asyncState() {
    let listenCount = 0;

    let isErr = false;
    try {
      const playList = await this.playList();
      this.logger.info(`本次刷歌歌单列表：${playList}`);

      topLoop: for (let i = 0; i < playList.length; i++) {
        this.logger.info(
          `-------------------当前歌单: < ${playList[i].name} > -------------------`
        );

        const list = await this.playListDetail(playList[i].id);

        for (let k = 0; k < list.length; k++) {
          // 如果已达刷歌上线，则退出循环
          if (
            Const.LISTEN_MAX_COUNT != -1 &&
            listenCount > Const.LISTEN_MAX_COUNT
          ) {
            break topLoop;
          }

          // todo 听歌
          await Tools.sleep(Const.LISTEN_SLEEP_TIME);
          try {
            await this.feedback(list[k]);
            listenCount++;
          } catch (error) {
            this.logger.error('当前歌曲：', list[i]);
            this.logger.error('错误：', error);
            this.logger.info(
              `听歌失败，当前歌单：${playList[i].name},休息 ${Const.LISTEN_ERROR_SLEEP_TIME} 毫秒 ^-^`
            );
            await Tools.sleep(Const.LISTEN_ERROR_SLEEP_TIME);
          }
        }
      }
    } catch (error) {
      isErr = true;

      this.logger.error(
        `刷歌报错，err：${error}，休息 ${Const.LISTEN_ERROR_SLEEP_TIME} 毫秒 ^-^`,
        error
      );
      await Tools.sleep(Const.LISTEN_ERROR_SLEEP_TIME);
    }

    if (!isErr) {
      this.logger.info(`今日刷歌完成，共计 ${listenCount - 1} 首 ~ ~`);
    } else {
      this.asyncState();
      return;
    }

    this.listenedEvent();
  }

  // 获取歌单
  async playList() {
    return new Promise(async (resolve, reject) => {
      try {
        const res = await Api.request('recommend_resource');

        this.logger.info(res);

        if (res && res.status === Const.CLOUD_MUSIC_SUCCESS_STATUS) {
          this.logger.info(
            `获取每日推荐歌单成功，共计 ${res.body.recommend.length} 个`
          );
          const playList = res.body.recommend.map((v) => {
            return { id: v.id, name: v.name };
          });

          resolve(playList);
        } else {
          this.logger.error('获取每日推荐歌单失败');
          reject('获取每日推荐歌单失败');
        }
      } catch (error) {
        return reject(error);
      }
    });
  }

  // 歌单歌曲列表
  async playListDetail(id = 0) {
    return new Promise(async (resolve, reject) => {
      const res = await Api.playlist_track_all({
        id,
      });

      this.logger.info(res);

      if (res && res.status === Const.CLOUD_MUSIC_SUCCESS_STATUS) {
        this.logger.info(
          `获取歌单详情成功，id ${id} 共计 ${res.body.songs.length} 首歌曲`
        );
        const playSongs = res.body.songs.map((v) => {
          return {
            id: v.id,
            sourceId: id,
            dt: v.dt,
            name: v.name,
          };
        });

        resolve(playSongs);
      } else {
        this.logger.error('获取歌单歌曲列表失败');
        reject('获取歌单歌曲列表失败');
      }
    });
  }

  // 听歌
  async feedback(song = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const { id, sourceId, dt } = song;
        if (!id) {
          return reject('缺少id');
        }

        if (!sourceId) {
          return reject('缺少sourceId');
        }

        if (!dt) {
          return reject('缺少dt');
        }

        const res = await Api.request('scrobble', {
          id: song.id,
          sourceid: song.sourceId,
          time: song.dt,
          t: new Date().getTime(),
        });

        this.logger.info(res);

        if (res && res.status === Const.CLOUD_MUSIC_SUCCESS_STATUS) {
          this.logger.info(
            `听歌反馈成功, 歌曲id ${song.id} 歌曲名称 「${song.name}」`
          );
          resolve();
        } else {
          this.logger.error('听歌反馈失败');
          reject('听歌反馈失败');
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  // 获取用户等级信息
  // level() {
  //   return new Promise(async (resolve, reject) => {
  //     const cookie = this.getCookie();

  //     const res = await user_level({
  //       cookie,
  //     });

  //     // {
  //     //   status: 200,
  //     //   body: {
  //     //     full: false,
  //     //     data: {
  //     //       userId: 483508892,
  //     //       info: '60G音乐云盘免费容量$黑名单上限120$云音乐商城满100减12元优惠券$价值1200云贝',
  //     //       progress: 0.9846666666666667,
  //     //       nextPlayCount: 12000,
  //     //       nextLoginCount: 350,
  //     //       nowPlayCount: 11816,
  //     //       nowLoginCount: 350,
  //     //       level: 9
  //     //     },
  //     //     code: 200
  //     //   },
  //     //   cookie: []
  //     // }
  //     this.logger.info(res);

  //     if (res && res.status === Const.CLOUD_MUSIC_SUCCESS_STATUS) {
  //       return resolve(res.body.data);
  //     }

  //     this.logger.error('获取等级信息失败');
  //     reject('获取等级信息失败');
  //   });
  // }

  // 计算提示信息
  // calculateTip(data) {
  //   const {
  //     nextPlayCount,
  //     nowPlayCount,
  //     nextLoginCount,
  //     nowLoginCount,
  //     level,
  //   } = data;

  //   const tips = {
  //     levelTip: `距离十级大佬还有 ${10 - level} 级 ～～`,
  //     levelNextTip: `距离下一级还需要听歌 ${nextPlayCount - nowPlayCount} 首`,
  //     loginNextTip: `距离下一级还需登录 ${nextLoginCount - nowLoginCount} 天`,
  //   };

  //   return {
  //     ...data,
  //     ...tips,
  //   };
  // }

  // 检查是否已刷歌
  // check() {
  //   const currSignedDate = this.getListenedDate();
  //   const now = new Date().toISOString().split('T').shift();
  //   this.logger.info(
  //     `上次刷歌时间：${currSignedDate}, 当前日期：${now}, 是否已刷歌：${
  //       currSignedDate === now
  //     }`
  //   );

  //   return now === currSignedDate;
  // }

  // listen in event
  listenedEvent() {
    this.logger.info('发送听歌完成消息');
    PageEvent.emit(Const.LISTEN_FINISHED_EVENT_TOPIC);
  }
}

module.exports = Listen;
