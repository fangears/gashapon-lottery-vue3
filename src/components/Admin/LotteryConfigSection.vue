<script setup lang="ts">

const props = defineProps<{
  requireSocialAccount: boolean;
  useStockAsWeight: boolean;
}>();

const emit = defineEmits<{
  (e: "update:requireSocialAccount", value: boolean): void;
  (e: "update:useStockAsWeight", value: boolean): void;
}>();
</script>

<template>
  <section class="card admin-config">
    <h2>抽奖配置</h2>
    <el-form label-width="160px">
      <el-form-item label="填写社媒账号开始抽奖">
        <el-switch :model-value="props.requireSocialAccount"
          @update:model-value="(v: boolean) => emit('update:requireSocialAccount', v)" />
      </el-form-item>

      <el-form-item label="库存决定中奖概率">
        <el-switch :model-value="props.useStockAsWeight"
          @update:model-value="(v: boolean) => emit('update:useStockAsWeight', v)" />
      </el-form-item>
    </el-form>
  </section>
</template>

<style scoped>
.admin-config {
  display: grid;
  gap: var(--space-md);
}
</style>
