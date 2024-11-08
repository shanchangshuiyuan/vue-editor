<template>
  <div class="app">
    <Editor v-model="state" :formData="formData"></Editor>

    <!-- <Range :start="0" :end="100"></Range> -->
  </div>
</template>

<script setup>
import { ref, provide } from "vue";
import data from "./data.json";
import Editor from "./packages/editor";
import { registerConfig as config } from "./utils/editor-config";
import Range from "./components/Range";
const state = ref(data);

provide("config", config); // 将组件的配置直接传过去

const formData = ref({
  username: "zgy",
  password: 123,
  start: 0,
  end: 100,
});
</script>

<style lang="scss">
.app {
  position: fixed;
  top: 20px;
  left: 20px;
  right: 20px;
  bottom: 20px;
}
</style>
